import type { PUZZLES } from './algorithm-puzzles'
import type { JUDGES } from './algorithm-judges'

export const MAX_CODE_LENGTH = 32 * 1024
export const MAX_TEST_CASES = 20
export const MAX_INPUT_BYTES = 64 * 1024
export const MAX_OUTPUT_BYTES = 64 * 1024
export const MAX_LOG_BYTES = 16 * 1024
export const MAX_ERROR_BYTES = 4 * 1024
export const MAX_LOG_ENTRIES = 128
export const MAX_VALUE_DEPTH = 8
export const MAX_VALUE_NODES = 2048
export const WORKER_STARTUP_TIMEOUT_MS = 10000
export const MAX_RUN_TIME_MS = 3000

export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue }
export type PuzzleId = keyof typeof PUZZLES
export type JudgeId = keyof typeof JUDGES
export type CaseStatus = 'passed' | 'wrong-answer' | 'syntax-error' | 'runtime-error' | 'output-limit' | 'timeout' | 'stopped'
export type RunStatus = CaseStatus | 'idle' | 'running' | 'invalid-input' | 'runner-error'

export interface AlgorithmTestCase {
  readonly id: string
  readonly label: string
  readonly args: readonly JsonValue[]
  readonly expected: JsonValue
}

export interface AlgorithmPuzzle {
  readonly id: string
  readonly title: string
  readonly entryPoint: string
  readonly parameterNames: readonly string[]
  readonly judge: JudgeId
  readonly expectedHint: string
  readonly failureMessage: string
  readonly initialCode: string
  readonly tests: readonly AlgorithmTestCase[]
}

export interface RunRequest {
  type: 'run'
  requestId: number
  puzzleId: PuzzleId
  source: string
}

export interface CaseResult {
  caseId: string
  status: CaseStatus
  actual: string
  error: string
  durationMs: number
  logs: string[]
}

export type RunnerResponse =
  | { type: 'ready' }
  | { type: 'case-start'; requestId: number; caseId: string }
  | { type: 'case-result'; requestId: number; result: CaseResult }
  | { type: 'done'; requestId: number; status: CaseStatus; durationMs: number }
  | { type: 'runner-error'; requestId: number; error: string }

export const STATUS_LABELS: Record<RunStatus, string> = {
  idle: '尚未运行',
  running: '运行中',
  passed: '通过',
  'wrong-answer': '答案错误',
  'syntax-error': '语法错误',
  'runtime-error': '运行时错误',
  timeout: '超时',
  'output-limit': '输出超限',
  stopped: '已停止',
  'invalid-input': '代码无效',
  'runner-error': '执行器错误',
}

export function validateSource(source: string): string {
  if (source.length > MAX_CODE_LENGTH) return `代码超过 ${MAX_CODE_LENGTH} 个 UTF-16 代码单元，请缩短后运行。`
  if (!source.trim()) return '请输入 JavaScript 代码后再运行。'
  return ''
}
