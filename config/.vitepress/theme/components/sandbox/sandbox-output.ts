import { MAX_ERROR_BYTES, MAX_LOG_BYTES, MAX_LOG_ENTRIES, MAX_OUTPUT_BYTES, MAX_VALUE_DEPTH, MAX_VALUE_NODES } from './sandbox-types'
import type { JsonValue } from './sandbox-types'

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const ERROR_TRUNCATION_RESERVE = 6
export const OUTPUT_LIMIT_MESSAGE = '输出、日志或结果结构超过限制，请减少返回内容或 console 输出。'

export class OutputBudget {
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

  capture(value: unknown, log = false): { text: string; json: JsonValue | undefined } {
    let nodes = 0
    let valid = true
    const seen = new WeakSet<object>()
    const append = (text: string) => this.consume(text, log)
    const quote = (text: string) => {
      if (text.length > MAX_OUTPUT_BYTES - this.outputBytes) this.fail()
      return append(JSON.stringify(text))
    }
    const invalid = (text: string): [string, JsonValue] => {
      valid = false
      return [append(text), null]
    }
    const visit = (item: unknown, depth: number): [string, JsonValue] => {
      if (++nodes > MAX_VALUE_NODES || depth > MAX_VALUE_DEPTH) this.fail()
      if (item === null) return [append('null'), null]
      if (typeof item === 'string') return [quote(item), item]
      if (typeof item === 'boolean') return [append(String(item)), item]
      if (typeof item === 'number') return Number.isFinite(item) ? [append(String(item)), item] : invalid(String(item))
      if (typeof item === 'undefined') return invalid('undefined')
      if (typeof item === 'bigint') return invalid(`${item}n`)
      if (typeof item === 'symbol') return invalid('[Symbol]')
      if (typeof item === 'function') return invalid('[Function]')
      if (typeof item !== 'object') return invalid('[未知值]')
      if (seen.has(item)) return invalid('[循环引用]')
      seen.add(item)
      const parts: string[] = []
      let snapshot: JsonValue
      if (Array.isArray(item)) {
        const length = Object.getOwnPropertyDescriptor(item, 'length')?.value
        if (!Number.isSafeInteger(length) || length < 0 || length > MAX_VALUE_NODES - nodes) this.fail()
        const items: JsonValue[] = []
        parts.push(append('['))
        for (let index = 0; index < length; index++) {
          if (index) parts.push(append(', '))
          const descriptor = Object.getOwnPropertyDescriptor(item, String(index))
          const [text, child] = !descriptor ? invalid('[空位]') : 'value' in descriptor ? visit(descriptor.value, depth + 1) : invalid('[访问器]')
          parts.push(text)
          items.push(child)
        }
        parts.push(append(']'))
        snapshot = items
      } else {
        const prototype = Object.getPrototypeOf(item)
        if (prototype !== Object.prototype && prototype !== null) valid = false
        const keys = Reflect.ownKeys(item)
        if (keys.length > MAX_VALUE_NODES - nodes) this.fail()
        const object: { [key: string]: JsonValue } = Object.create(null)
        parts.push(append('{'))
        let count = 0
        for (const key of keys) {
          const descriptor = Object.getOwnPropertyDescriptor(item, key)
          if (!descriptor?.enumerable) continue
          if (count++) parts.push(append(', '))
          parts.push(typeof key === 'string' ? quote(key) : invalid('[Symbol]')[0], append(': '))
          const [text, child] = 'value' in descriptor ? visit(descriptor.value, depth + 1) : invalid('[访问器]')
          parts.push(text)
          if (typeof key === 'string') object[key] = child
        }
        parts.push(append('}'))
        snapshot = object
      }
      seen.delete(item)
      return [parts.join(''), snapshot]
    }
    const [text, json] = visit(value, 0)
    return { text, json: valid ? json : undefined }
  }

  log(level: string, values: unknown[]): string {
    if (++this.logEntries > MAX_LOG_ENTRIES || values.length > MAX_VALUE_NODES) this.fail()
    const parts = [this.consume(`${level}: `, true)]
    for (let index = 0; index < values.length; index++) {
      if (index) parts.push(this.consume(' ', true))
      parts.push(this.capture(values[index], true).text)
    }
    parts.push(this.consume('\n', true))
    return parts.join('')
  }
}

export function errorText(error: unknown): string {
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
