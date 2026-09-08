import 'ses'
import { getPuzzle, isPuzzleId } from './algorithm-puzzles'
import { JUDGES } from './algorithm-judges'
import { OutputBudget, OUTPUT_LIMIT_MESSAGE, errorText } from './sandbox-output'
import { MAX_INPUT_BYTES, MAX_TEST_CASES, validateSource } from './sandbox-types'
import type { AlgorithmPuzzle, AlgorithmTestCase, CaseResult, CaseStatus, RunRequest, RunnerResponse } from './sandbox-types'

const channel = globalThis as unknown as {
  postMessage: (message: RunnerResponse) => void
  onmessage: ((event: MessageEvent<unknown>) => void) | null
}
const encoder = new TextEncoder()
const OUTPUT_LIMIT_STATUS: CaseStatus = 'output-limit'

function send(message: RunnerResponse) {
  channel.postMessage(message)
}

function runCase(source: string, puzzle: AlgorithmPuzzle, test: AlgorithmTestCase, budget: OutputBudget): CaseResult {
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
    const entry = puzzle.entryPoint
    const factory = new compartment.globalThis.Function(`${source}\n;return typeof ${entry} === 'function' ? ${entry} : undefined`)
    phase = 'execute'
    const solve: unknown = factory()
    if (typeof solve !== 'function') throw new TypeError(`请定义同步函数 ${entry}(${puzzle.parameterNames.join(', ')})，不要使用 export 或 module.exports。`)
    const value: unknown = solve(...structuredClone(test.args))
    if (value !== null && (typeof value === 'object' || typeof value === 'function') && typeof (value as { then?: unknown }).then === 'function') {
      if (value instanceof Promise) Promise.prototype.then.call(value, () => undefined, () => undefined)
      throw new TypeError('只支持同步返回 JSON 数据，不支持 async、Promise 或 thenable 结果。')
    }
    const snapshot = budget.capture(value)
    result.actual = snapshot.text
    result.status = snapshot.json !== undefined && JUDGES[puzzle.judge](snapshot.json, test) ? 'passed' : 'wrong-answer'
    if (result.status === 'wrong-answer') result.error = budget.consume(puzzle.failureMessage, false)
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
    && isPuzzleId(request.puzzleId) && typeof request.source === 'string'
}

function run(request: RunRequest) {
  const sourceError = validateSource(request.source)
  if (sourceError) throw new Error(sourceError)
  const puzzle = getPuzzle(request.puzzleId)
  if (!Object.hasOwn(JUDGES, puzzle.judge)) throw new Error('题目指定的判题策略不存在。')
  if (!puzzle.tests.length || puzzle.tests.length > MAX_TEST_CASES) throw new Error('测试用例数量不符合限制。')
  if (encoder.encode(JSON.stringify(puzzle.tests)).byteLength > MAX_INPUT_BYTES) throw new Error('测试输入超过大小限制。')
  const budget = new OutputBudget()
  const started = performance.now()
  let status: CaseStatus = 'passed'
  for (const test of puzzle.tests) {
    send({ type: 'case-start', requestId: request.requestId, caseId: test.id })
    const result = runCase(request.source, puzzle, test, budget)
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
