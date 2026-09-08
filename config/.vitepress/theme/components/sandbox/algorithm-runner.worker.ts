import 'ses'
import { getPuzzle } from './algorithm-puzzles'
import {
  MAX_ERROR_BYTES,
  MAX_INPUT_BYTES,
  MAX_LOG_BYTES,
  MAX_LOG_ENTRIES,
  MAX_OUTPUT_BYTES,
  MAX_TEST_CASES,
  MAX_VALUE_DEPTH,
  MAX_VALUE_NODES,
  validateSource,
} from './sandbox-types'
import type { AlgorithmTestCase, CaseResult, CaseStatus, RunRequest, RunnerResponse } from './sandbox-types'

const channel = globalThis as unknown as {
  postMessage: (message: RunnerResponse) => void
  onmessage: ((event: MessageEvent<unknown>) => void) | null
}
const encoder = new TextEncoder()
const decoder = new TextDecoder()
const OUTPUT_LIMIT_MESSAGE = '输出、日志或结果结构超过限制，请减少返回内容或 console 输出。'
const ERROR_TRUNCATION_RESERVE = 6
const OUTPUT_LIMIT_STATUS: CaseStatus = 'output-limit'

function send(message: RunnerResponse) {
  channel.postMessage(message)
}

class OutputBudget {
  exceeded = false
  private outputBytes = encoder.encode(OUTPUT_LIMIT_MESSAGE).byteLength
  private logBytes = 0
  private logEntries = 0

  fail(): never {
    this.exceeded = true
    throw new Error(OUTPUT_LIMIT_MESSAGE)
  }

  consume(text: string, log: boolean): string {
    if (this.exceeded || text.length > MAX_OUTPUT_BYTES - this.outputBytes) this.fail()
    const bytes = encoder.encode(text).byteLength
    if (bytes > MAX_OUTPUT_BYTES - this.outputBytes || (log && bytes > MAX_LOG_BYTES - this.logBytes)) this.fail()
    this.outputBytes += bytes
    if (log) this.logBytes += bytes
    return text
  }

  format(value: unknown, log = false): string {
    let nodes = 0
    const seen = new WeakSet<object>()
    const append = (text: string) => this.consume(text, log)
    const quote = (text: string) => {
      if (text.length > MAX_OUTPUT_BYTES - this.outputBytes) this.fail()
      return append(JSON.stringify(text))
    }
    const visit = (item: unknown, depth: number): string => {
      if (++nodes > MAX_VALUE_NODES || depth > MAX_VALUE_DEPTH) this.fail()
      if (item === null) return append('null')
      if (typeof item === 'string') return quote(item)
      if (typeof item === 'number' || typeof item === 'boolean' || typeof item === 'undefined') return append(String(item))
      if (typeof item === 'bigint') return append(`${item}n`)
      if (typeof item === 'symbol') return append('[Symbol]')
      if (typeof item === 'function') return append('[Function]')
      if (typeof item !== 'object') return append('[未知值]')
      if (seen.has(item)) return append('[循环引用]')
      seen.add(item)
      const parts: string[] = []
      if (Array.isArray(item)) {
        const length = Object.getOwnPropertyDescriptor(item, 'length')?.value
        if (!Number.isSafeInteger(length) || length < 0 || length > MAX_VALUE_NODES - nodes) this.fail()
        parts.push(append('['))
        for (let index = 0; index < length; index++) {
          if (index) parts.push(append(', '))
          const descriptor = Object.getOwnPropertyDescriptor(item, String(index))
          parts.push(!descriptor ? append('[空位]') : 'value' in descriptor ? visit(descriptor.value, depth + 1) : append('[访问器]'))
        }
        parts.push(append(']'))
      } else {
        const keys = Reflect.ownKeys(item)
        if (keys.length > MAX_VALUE_NODES - nodes) this.fail()
        parts.push(append('{'))
        let count = 0
        for (const key of keys) {
          const descriptor = Object.getOwnPropertyDescriptor(item, key)
          if (!descriptor?.enumerable) continue
          if (count++) parts.push(append(', '))
          parts.push(typeof key === 'string' ? quote(key) : append('[Symbol]'), append(': '))
          parts.push('value' in descriptor ? visit(descriptor.value, depth + 1) : append('[访问器]'))
        }
        parts.push(append('}'))
      }
      seen.delete(item)
      return parts.join('')
    }
    return visit(value, 0)
  }

  log(level: string, values: unknown[]): string {
    if (++this.logEntries > MAX_LOG_ENTRIES || values.length > MAX_VALUE_NODES) this.fail()
    const parts = [this.consume(`${level}: `, true)]
    for (let index = 0; index < values.length; index++) {
      if (index) parts.push(this.consume(' ', true))
      parts.push(this.format(values[index], true))
    }
    parts.push(this.consume('\n', true))
    return parts.join('')
  }
}

function errorText(error: unknown): string {
  let text = '执行失败；抛出的值没有可安全读取的错误信息。'
  try {
    if (typeof error === 'string') text = error
    else if (error && typeof error === 'object') {
      const descriptor = Object.getOwnPropertyDescriptor(error, 'message')
      if (descriptor && 'value' in descriptor && typeof descriptor.value === 'string') text = descriptor.value
    }
  } catch {
    text = '执行失败；无法读取抛出值的错误信息。'
  }
  const bytes = encoder.encode(text.slice(0, MAX_ERROR_BYTES))
  return text.length > MAX_ERROR_BYTES || bytes.length > MAX_ERROR_BYTES
    ? `${decoder.decode(bytes.subarray(0, MAX_ERROR_BYTES - ERROR_TRUNCATION_RESERVE))}…`
    : text
}

function snapshotIndices(value: unknown): [number, number] | undefined {
  if (!Array.isArray(value) || Object.getOwnPropertyDescriptor(value, 'length')?.value !== 2) return
  const left = Object.getOwnPropertyDescriptor(value, '0')
  const right = Object.getOwnPropertyDescriptor(value, '1')
  if (!left || !right || !('value' in left) || !('value' in right)) return
  if (typeof left.value !== 'number' || typeof right.value !== 'number') return
  if (!Number.isInteger(left.value) || !Number.isInteger(right.value)) return
  return [left.value, right.value]
}

function isAnswer(indices: [number, number] | undefined, test: AlgorithmTestCase): boolean {
  if (!indices) return false
  const [left, right] = indices
  return left !== right && left >= 0 && right >= 0 && left < test.nums.length && right < test.nums.length
    && test.nums[left] + test.nums[right] === test.target
}

function runCase(source: string, test: AlgorithmTestCase, budget: OutputBudget): CaseResult {
  const started = performance.now()
  const logs: string[] = []
  const result: CaseResult = { caseId: test.id, status: 'runtime-error', actual: '', error: '', durationMs: 0, logs }
  const writeLog = (level: string, values: unknown[]) => {
    logs.push(budget.log(level, values))
  }
  const compartment = new Compartment({
    globals: {
      console: harden({
        log: (...values: unknown[]) => writeLog('log', values),
        warn: (...values: unknown[]) => writeLog('warn', values),
        error: (...values: unknown[]) => writeLog('error', values),
      }),
    },
    __options__: true,
  })
  let phase: 'compile' | 'execute' = 'compile'
  try {
    const factory = new compartment.globalThis.Function(`${source}\n;return typeof twoSum === 'function' ? twoSum : undefined`)
    phase = 'execute'
    const solve: unknown = factory()
    if (typeof solve !== 'function') throw new TypeError('请定义同步函数 twoSum(nums, target)，不要使用 export 或 module.exports。')
    const value: unknown = solve(structuredClone(test.nums), test.target)
    if (value !== null && (typeof value === 'object' || typeof value === 'function') && typeof (value as { then?: unknown }).then === 'function') {
      if (value instanceof Promise) Promise.prototype.then.call(value, () => undefined, () => undefined)
      throw new TypeError('只支持同步返回两个下标，不支持 async、Promise 或 thenable 结果。')
    }
    const indices = snapshotIndices(value)
    result.actual = budget.format(indices ?? value)
    result.status = isAnswer(indices, test) ? 'passed' : 'wrong-answer'
    if (result.status === 'wrong-answer') result.error = budget.consume('请返回两个不同且有效的整数下标，对应数值之和必须等于 target；下标顺序不限。', false)
  } catch (error) {
    result.status = budget.exceeded ? OUTPUT_LIMIT_STATUS : phase === 'compile' ? 'syntax-error' : 'runtime-error'
    try {
      result.error = budget.exceeded ? OUTPUT_LIMIT_MESSAGE : budget.consume(errorText(error), false)
    } catch {
      result.status = OUTPUT_LIMIT_STATUS
      result.error = OUTPUT_LIMIT_MESSAGE
    }
  }
  if (budget.exceeded) {
    result.status = OUTPUT_LIMIT_STATUS
    result.error = OUTPUT_LIMIT_MESSAGE
  }
  result.durationMs = performance.now() - started
  return result
}

function isRequest(value: unknown): value is RunRequest {
  if (!value || typeof value !== 'object') return false
  const request = value as Partial<RunRequest>
  return request.type === 'run' && Number.isSafeInteger(request.requestId) && (request.requestId ?? 0) > 0
    && request.puzzleId === 'two-sum' && typeof request.source === 'string'
}

function run(request: RunRequest) {
  const sourceError = validateSource(request.source)
  if (sourceError) throw new Error(sourceError)
  const puzzle = getPuzzle(request.puzzleId)
  if (!puzzle.tests.length || puzzle.tests.length > MAX_TEST_CASES) throw new Error('测试用例数量不符合限制。')
  if (encoder.encode(JSON.stringify(puzzle.tests)).byteLength > MAX_INPUT_BYTES) throw new Error('测试输入超过大小限制。')
  const budget = new OutputBudget()
  const started = performance.now()
  let status: CaseStatus = 'passed'
  for (const test of puzzle.tests) {
    send({ type: 'case-start', requestId: request.requestId, caseId: test.id })
    const result = runCase(request.source, test, budget)
    send({ type: 'case-result', requestId: request.requestId, result })
    if (result.status === 'syntax-error' || result.status === OUTPUT_LIMIT_STATUS) {
      status = result.status
      break
    }
    if (result.status === 'runtime-error' || (result.status === 'wrong-answer' && status === 'passed')) status = result.status
  }
  send({ type: 'done', requestId: request.requestId, status, durationMs: performance.now() - started })
}

try {
  lockdown()
  let accepted = false
  channel.onmessage = ({ data }) => {
    if (accepted) return
    accepted = true
    const requestId = isRequest(data) ? data.requestId : 0
    try {
      if (!isRequest(data)) throw new Error('无效的执行请求。')
      run(data)
    } catch (error) {
      send({ type: 'runner-error', requestId, error: errorText(error) })
    }
  }
  send({ type: 'ready' })
} catch {
  send({ type: 'runner-error', requestId: 0, error: '执行隔离初始化失败，已禁用运行；不会降级为不受限执行。' })
}
