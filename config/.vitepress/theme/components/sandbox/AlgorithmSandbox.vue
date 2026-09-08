<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { EditorView as CodeMirrorView } from 'codemirror'
import type { HighlightStyle } from '@codemirror/language'
import { getPuzzle } from './algorithm-puzzles'
import {
  MAX_CODE_LENGTH,
  MAX_ERROR_BYTES,
  MAX_LOG_BYTES,
  MAX_LOG_ENTRIES,
  MAX_OUTPUT_BYTES,
  MAX_RUN_TIME_MS,
  MAX_TEST_CASES,
  STATUS_LABELS,
  WORKER_STARTUP_TIMEOUT_MS,
  validateSource,
} from './sandbox-types'
import type { AlgorithmPuzzle, CaseResult, CaseStatus, PuzzleId, RunRequest, RunStatus } from './sandbox-types'

const props = defineProps<{ id: string; puzzleId: PuzzleId }>()
const puzzle = computed(() => getPuzzle(props.puzzleId))
const source = ref(puzzle.value.initialCode)
const status = ref<RunStatus>('idle')
const running = computed(() => status.value === 'running')
const phase = ref<'starting' | 'executing'>('starting')
const results = ref<CaseResult[]>([])
const currentCaseId = ref<string | null>(null)
const totalDuration = ref<number | null>(null)
const runError = ref('')
const editorError = ref('')
const errorMessage = computed(() => [editorError.value, runError.value || results.value.find(result => result.error)?.error].filter(Boolean).join('\n'))
const editorHost = ref<HTMLDivElement | null>(null)
const fallbackEditor = ref<HTMLTextAreaElement | null>(null)
const editorLoadState = ref<'loading' | 'ready' | 'failed'>('loading')
const rows = computed(() => puzzle.value.tests.map(test => {
  const result = results.value.find(item => item.caseId === test.id)
  return { test, result, status: result?.status ?? (currentCaseId.value === test.id ? 'running' : 'pending') }
}))
const passedCount = computed(() => results.value.filter(result => result.status === 'passed').length)
const summary = computed(() => running.value
  ? phase.value === 'starting' ? '正在初始化执行器' : '运行中'
  : STATUS_LABELS[status.value])
const CASE_STATUSES: readonly CaseStatus[] = [
  'passed', 'wrong-answer', 'syntax-error', 'runtime-error', 'output-limit', 'timeout', 'stopped',
]
const MILLISECONDS_PER_SECOND = 1000
const DURATION_DECIMALS = 1
const SYNTAX_PALETTE = ['var(--sandbox-syntax-violet)', 'var(--sandbox-syntax-blue)', 'var(--sandbox-syntax-green)', 'var(--sandbox-syntax-red)']

interface ActiveRun {
  worker: Worker
  requestId: number
  puzzle: AlgorithmPuzzle
  source: string
  startupTimer: ReturnType<typeof setTimeout> | null
  runTimer: ReturnType<typeof setTimeout> | null
  startedAt: number | null
  caseStartedAt: number | null
  outputBytes: number
  logBytes: number
}

let mounted = false
let editorToken = 0
let editor: CodeMirrorView | null = null
let editorIsReadOnly = false
let writableState: CodeMirrorView['state'] | null = null
let editorModule: typeof import('codemirror') | null = null
let javascriptModule: typeof import('@codemirror/lang-javascript') | null = null
let languageModule: typeof import('@codemirror/language') | null = null
let highlightStyle: HighlightStyle | null = null
let activeRun: ActiveRun | null = null
let requestSequence = 0

function createEditor(fresh = false) {
  if (!mounted || !editorHost.value || !editorModule || !javascriptModule || !languageModule || !highlightStyle) return
  const { EditorView, basicSetup } = editorModule
  const wasFocused = editor?.hasFocus ?? false
  const scrollTop = editor?.scrollDOM.scrollTop ?? 0
  const scrollLeft = editor?.scrollDOM.scrollLeft ?? 0
  if (fresh) writableState = null
  else if (editor && !editorIsReadOnly && running.value) writableState = editor.state
  editor?.destroy()
  editor = null
  editorIsReadOnly = running.value
  const restoredState = !fresh && !running.value && writableState?.doc.toString() === source.value
    ? writableState
    : undefined
  editor = new EditorView({
    parent: editorHost.value,
    ...(restoredState ? { state: restoredState } : {
      doc: source.value,
      extensions: [
        basicSetup,
        javascriptModule.javascript(),
        languageModule.syntaxHighlighting(highlightStyle),
        EditorView.lineWrapping,
        EditorView.editable.of(!running.value),
        EditorView.contentAttributes.of({
          id: `${props.id}-code`,
          'aria-label': `${puzzle.value.title} JavaScript 代码`,
          'aria-describedby': `${props.id}-editor-help`,
          'aria-readonly': String(running.value),
          spellcheck: 'false',
          tabindex: '0',
        }),
        EditorView.updateListener.of(update => {
          if (update.docChanged) source.value = update.state.doc.toString()
        }),
        EditorView.theme({
          '&': { color: 'var(--vp-c-text-1)', backgroundColor: 'var(--vp-c-bg)', fontSize: '14px' },
          '.cm-scroller': { fontFamily: 'var(--vp-font-family-mono)', overflow: 'auto', lineHeight: '1.65' },
          '.cm-content': { minHeight: '240px', caretColor: 'var(--vp-c-text-1)', padding: '12px 0' },
          '.cm-line': { padding: '0 12px', overflowWrap: 'anywhere' },
          '.cm-gutters': { color: 'var(--vp-c-text-2)', backgroundColor: 'var(--vp-c-bg-soft)', borderColor: 'var(--vp-c-divider)' },
          '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--vp-c-brand-soft)' },
          '.cm-cursor': { borderLeftColor: 'var(--vp-c-text-1)' },
          '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'var(--vp-c-brand-soft)' },
          '.cm-panels, .cm-tooltip': { color: 'var(--vp-c-text-1)', backgroundColor: 'var(--vp-c-bg-soft)', borderColor: 'var(--vp-c-divider)' },
        }),
      ],
    }),
    dispatchTransactions(transactions, view) {
      if (running.value && transactions.some(transaction => transaction.docChanged)) return
      view.update(transactions)
    },
  })
  if (!running.value) writableState = null
  editor.scrollDOM.scrollTop = scrollTop
  editor.scrollDOM.scrollLeft = scrollLeft
  if (wasFocused) editor.focus()
}

function useFallbackEditor(message: string) {
  editor?.destroy()
  editor = null
  writableState = null
  editorHost.value?.replaceChildren()
  editorLoadState.value = 'failed'
  editorError.value = message
}

function syncEditor() {
  if (editorLoadState.value !== 'ready') return
  try {
    createEditor()
  } catch {
    useFallbackEditor('代码编辑器发生错误，已保留源码并切换为普通文本框。仍可运行代码。')
  }
}

watch(running, syncEditor, { flush: 'sync' })

onMounted(async () => {
  mounted = true
  const token = ++editorToken
  try {
    const [codeMirror, javascript, language] = await Promise.all([
      import('codemirror'),
      import('@codemirror/lang-javascript'),
      import('@codemirror/language'),
    ])
    if (!mounted || token !== editorToken) return
    editorModule = codeMirror
    javascriptModule = javascript
    languageModule = language
    let colorIndex = 0
    highlightStyle = language.HighlightStyle.define(language.defaultHighlightStyle.specs.map(spec => spec.color
      ? { ...spec, color: SYNTAX_PALETTE[colorIndex++ % SYNTAX_PALETTE.length] }
      : spec))
    const fallback = fallbackEditor.value
    const hadFocus = fallback === document.activeElement
    const selection = fallback ? { anchor: fallback.selectionStart, head: fallback.selectionEnd } : undefined
    createEditor()
    editorLoadState.value = 'ready'
    if (hadFocus && editor) {
      if (selection) editor.dispatch({ selection })
      editor.focus()
    }
  } catch {
    if (!mounted || token !== editorToken) return
    useFallbackEditor('代码编辑器加载失败，已保留源码并使用普通文本框。仍可运行代码。')
  }
})

function isCurrent(run: ActiveRun): boolean {
  return mounted && activeRun === run && activeRun.worker === run.worker && props.puzzleId === run.puzzle.id
}

function cleanup(run: ActiveRun | null = activeRun) {
  if (!run || activeRun !== run) return
  activeRun = null
  if (run.startupTimer !== null) clearTimeout(run.startupTimer)
  if (run.runTimer !== null) clearTimeout(run.runTimer)
  run.startupTimer = null
  run.runTimer = null
  run.worker.onmessage = null
  run.worker.onerror = null
  run.worker.onmessageerror = null
  run.worker.terminate()
  currentCaseId.value = null
}

function finish(run: ActiveRun, nextStatus: RunStatus, error = '') {
  if (!isCurrent(run)) return
  totalDuration.value = run.startedAt === null ? null : Math.max(0, performance.now() - run.startedAt)
  cleanup(run)
  runError.value = error
  status.value = nextStatus
}

function interrupt(run: ActiveRun, nextStatus: 'timeout' | 'stopped', message: string) {
  if (!isCurrent(run)) return
  if (currentCaseId.value) {
    results.value.push({
      caseId: currentCaseId.value,
      status: nextStatus,
      actual: '',
      error: message,
      logs: [],
      durationMs: run.caseStartedAt === null ? 0 : Math.max(0, performance.now() - run.caseStartedAt),
    })
  }
  finish(run, nextStatus, message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
}

function isCaseStatus(value: unknown): value is CaseStatus {
  return typeof value === 'string' && CASE_STATUSES.includes(value as CaseStatus)
}

function isDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER
}

function textBytes(value: unknown, limit: number): number | null {
  if (typeof value !== 'string' || value.length > limit) return null
  const bytes = new TextEncoder().encode(value).byteLength
  return bytes <= limit ? bytes : null
}

function readResult(value: unknown, run: ActiveRun): CaseResult | null {
  if (!isRecord(value) || !hasKeys(value, ['caseId', 'status', 'actual', 'error', 'durationMs', 'logs'])) return null
  if (typeof value.caseId !== 'string' || !isCaseStatus(value.status) || !isDuration(value.durationMs)) return null
  if (results.value.length >= run.puzzle.tests.length || results.value.length >= MAX_TEST_CASES) return null
  const expectedCase = run.puzzle.tests[results.value.length]
  if (value.caseId !== expectedCase?.id) return null
  const compileFailure = results.value.length === 0 && currentCaseId.value === null && value.status === 'syntax-error'
  if (!compileFailure && value.caseId !== currentCaseId.value) return null
  if (!Array.isArray(value.logs) || value.logs.length > MAX_LOG_ENTRIES) return null
  const actualBytes = textBytes(value.actual, MAX_OUTPUT_BYTES)
  const errorBytes = textBytes(value.error, MAX_ERROR_BYTES)
  if (actualBytes === null || errorBytes === null) return null
  let logBytes = 0
  for (const log of value.logs) {
    const bytes = textBytes(log, MAX_LOG_BYTES)
    if (bytes === null) return null
    logBytes += bytes
    if (run.logBytes + logBytes > MAX_LOG_BYTES) return null
  }
  const outputBytes = actualBytes + errorBytes + logBytes
  if (run.outputBytes + outputBytes > MAX_OUTPUT_BYTES) return null
  run.outputBytes += outputBytes
  run.logBytes += logBytes
  return {
    caseId: value.caseId,
    status: value.status,
    actual: value.actual as string,
    error: value.error as string,
    durationMs: value.durationMs,
    logs: [...value.logs] as string[],
  }
}

function receive(run: ActiveRun, data: unknown) {
  if (!isCurrent(run)) return
  const invalid = () => finish(run, 'runner-error', '执行器返回了无效消息，本轮已终止。请重试。')
  if (!isRecord(data) || typeof data.type !== 'string') return invalid()
  if (data.type !== 'ready') {
    if (!Number.isSafeInteger(data.requestId) || (data.requestId as number) < 0) return invalid()
    const startupFailure = run.startedAt === null && data.type === 'runner-error' && data.requestId === 0
    if (data.requestId !== run.requestId && !startupFailure) return
  }
  if (data.type === 'ready') {
    if (!hasKeys(data, ['type']) || run.startedAt !== null) return invalid()
    if (run.startupTimer !== null) clearTimeout(run.startupTimer)
    run.startupTimer = null
    run.startedAt = performance.now()
    phase.value = 'executing'
    run.runTimer = setTimeout(() => interrupt(run, 'timeout', `整轮运行超过 ${MAX_RUN_TIME_MS / MILLISECONDS_PER_SECOND} 秒，已终止执行。后续用例未运行。`), MAX_RUN_TIME_MS)
    const request: RunRequest = { type: 'run', requestId: run.requestId, puzzleId: run.puzzle.id, source: run.source }
    try {
      run.worker.postMessage(request)
    } catch {
      finish(run, 'runner-error', '无法向执行器发送代码，请重试。')
    }
    return
  }
  if (data.type === 'runner-error') {
    if (!hasKeys(data, ['type', 'requestId', 'error']) || textBytes(data.error, MAX_ERROR_BYTES) === null) return invalid()
    return finish(run, 'runner-error', (data.error as string) || '执行器发生错误，请重试。')
  }
  if (run.startedAt === null) return invalid()
  if (data.type === 'case-start') {
    if (!hasKeys(data, ['type', 'requestId', 'caseId']) || currentCaseId.value !== null) return invalid()
    if (typeof data.caseId !== 'string' || data.caseId !== run.puzzle.tests[results.value.length]?.id) return invalid()
    currentCaseId.value = data.caseId
    run.caseStartedAt = performance.now()
    return
  }
  if (data.type === 'case-result') {
    if (!hasKeys(data, ['type', 'requestId', 'result'])) return invalid()
    const result = readResult(data.result, run)
    if (!result) return invalid()
    results.value.push(result)
    currentCaseId.value = null
    run.caseStartedAt = null
    return
  }
  if (data.type === 'done') {
    if (!hasKeys(data, ['type', 'requestId', 'status', 'durationMs']) || !isCaseStatus(data.status) || !isDuration(data.durationMs)) return invalid()
    if (currentCaseId.value !== null || results.value.length === 0) return invalid()
    if (data.status === 'passed') {
      if (results.value.length !== run.puzzle.tests.length || results.value.some(result => result.status !== 'passed')) return invalid()
    } else if (!results.value.some(result => result.status === data.status)) return invalid()
    return finish(run, data.status)
  }
  invalid()
}

function runCode() {
  if (!mounted || running.value) return
  cleanup()
  results.value = []
  currentCaseId.value = null
  totalDuration.value = null
  runError.value = validateSource(source.value)
  if (runError.value) {
    status.value = 'invalid-input'
    return
  }
  phase.value = 'starting'
  status.value = 'running'
  try {
    const worker = new Worker(new URL('./algorithm-runner.worker.ts', import.meta.url), { type: 'module' })
    const run: ActiveRun = {
      worker,
      requestId: ++requestSequence,
      puzzle: puzzle.value,
      source: source.value,
      startupTimer: null,
      runTimer: null,
      startedAt: null,
      caseStartedAt: null,
      outputBytes: 0,
      logBytes: 0,
    }
    activeRun = run
    worker.onmessage = event => receive(run, event.data)
    worker.onerror = event => {
      if (!isCurrent(run)) return
      event.preventDefault()
      finish(run, 'runner-error', '执行器加载或运行失败。请检查浏览器支持与站点资源后重试。')
    }
    worker.onmessageerror = () => finish(run, 'runner-error', '无法读取执行器消息，本轮已终止。请重试。')
    run.startupTimer = setTimeout(() => finish(run, 'runner-error', `执行器初始化超过 ${WORKER_STARTUP_TIMEOUT_MS / MILLISECONDS_PER_SECOND} 秒，请检查资源加载后重试。`), WORKER_STARTUP_TIMEOUT_MS)
  } catch {
    cleanup()
    runError.value = '无法启动 Web Worker 执行器。请使用支持模块 Worker 的浏览器并检查站点资源。'
    status.value = 'runner-error'
  }
}

function stop() {
  if (activeRun) interrupt(activeRun, 'stopped', '已停止本轮运行，后续用例未运行。')
}

function reset() {
  cleanup()
  status.value = 'idle'
  phase.value = 'starting'
  source.value = puzzle.value.initialCode
  results.value = []
  currentCaseId.value = null
  totalDuration.value = null
  runError.value = ''
  if (editor) editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: source.value }, selection: { anchor: 0 } })
}

watch(() => [props.id, props.puzzleId], () => {
  reset()
  if (editorLoadState.value === 'ready') {
    writableState = null
    try {
      createEditor(true)
    } catch {
      useFallbackEditor('代码编辑器发生错误，已保留源码并切换为普通文本框。仍可运行代码。')
    }
  }
})

onBeforeUnmount(() => {
  mounted = false
  ++editorToken
  cleanup()
  editor?.destroy()
  editor = null
  writableState = null
  editorModule = null
  javascriptModule = null
  languageModule = null
  highlightStyle = null
})

function updateFallbackSource(event: Event) {
  if (!running.value) source.value = (event.target as HTMLTextAreaElement).value
}

function caseLabel(value: string): string {
  return value === 'pending' ? '未运行' : STATUS_LABELS[value as RunStatus]
}

function durationLabel(value: number): string {
  return `${value.toFixed(DURATION_DECIMALS)} ms`
}
</script>

<template>
  <section :id="id" class="sandbox" data-testid="sandbox" :aria-labelledby="`${id}-title`">
    <div class="sandbox__heading">
      <h2 :id="`${id}-title`">{{ puzzle.title }} · 算法沙盒</h2>
      <span class="sandbox__language">JavaScript</span>
    </div>
    <p :id="`${id}-editor-help`" class="sandbox__hint">同步函数 twoSum(nums, target)。Tab 可移出编辑区；运行时源码只读。</p>
    <p v-if="editorLoadState === 'loading'" class="sandbox__hint" role="status">正在加载代码编辑器，可先在文本框中编辑。</p>
    <div class="sandbox__editor" data-testid="sandbox-editor" :class="{ 'sandbox__editor--readonly': running }">
      <div ref="editorHost" />
      <textarea
        v-if="editorLoadState !== 'ready'"
        :id="`${id}-fallback-code`"
        ref="fallbackEditor"
        :value="source"
        @input="updateFallbackSource"
        :aria-label="`${puzzle.title} JavaScript 代码`"
        :aria-describedby="`${id}-editor-help`"
        :readonly="running"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
      />
    </div>
    <div class="sandbox__toolbar">
      <div class="sandbox__actions">
        <button type="button" data-testid="sandbox-run" :disabled="running" @click="runCode">运行代码</button>
        <button type="button" data-testid="sandbox-stop" :disabled="!running" @click="stop">停止</button>
        <button type="button" data-testid="sandbox-reset" @click="reset">重置</button>
      </div>
      <span class="sandbox__hint" :class="{ 'sandbox__length--invalid': source.length > MAX_CODE_LENGTH }">{{ source.length }} / {{ MAX_CODE_LENGTH }} 代码单元</span>
    </div>
    <div class="sandbox__summary" role="status" aria-live="polite" aria-atomic="true">
      <strong data-testid="sandbox-status" :data-status="status">{{ summary }}</strong>
      <span>通过 {{ passedCount }} / {{ puzzle.tests.length }} 例</span>
      <span data-testid="sandbox-total-duration">本轮耗时：{{ totalDuration === null ? '—' : durationLabel(totalDuration) }}</span>
    </div>
    <p v-if="errorMessage" class="sandbox__error" data-testid="sandbox-error" role="alert">{{ errorMessage }}</p>
    <p class="sandbox__hint">初始化最多 {{ WORKER_STARTUP_TIMEOUT_MS / MILLISECONDS_PER_SECOND }} 秒；整轮运行最多 {{ MAX_RUN_TIME_MS / MILLISECONDS_PER_SECOND }} 秒。耗时不含初始化，不作为性能基准。</p>
    <ol class="sandbox__cases" aria-label="逐例运行结果">
      <li
        v-for="row in rows"
        :key="row.test.id"
        class="sandbox__case"
        data-testid="sandbox-case"
        :data-case-id="row.test.id"
        :data-status="row.status"
      >
        <div class="sandbox__case-heading">
          <strong>{{ row.test.label }}</strong>
          <span class="sandbox__case-status">{{ caseLabel(row.status) }}</span>
          <span v-if="row.result" class="sandbox__hint">{{ durationLabel(row.result.durationMs) }}</span>
        </div>
        <dl>
          <div><dt>输入</dt><dd><code>nums = {{ JSON.stringify(row.test.nums) }}, target = {{ row.test.target }}</code></dd></div>
          <div><dt>期望</dt><dd><code>{{ JSON.stringify(row.test.expected) }}</code>（下标顺序不限）</dd></div>
          <div><dt>实际</dt><dd><pre v-if="row.result?.actual">{{ row.result.actual }}</pre><span v-else>—</span></dd></div>
          <div v-if="row.result?.error"><dt>错误</dt><dd class="sandbox__error"><pre>{{ row.result.error }}</pre></dd></div>
        </dl>
        <details v-if="row.result && row.result.logs.length" class="sandbox__logs">
          <summary>查看日志（{{ row.result.logs.length }} 条）</summary>
          <ol><li v-for="(log, index) in row.result.logs" :key="index"><pre>{{ log }}</pre></li></ol>
        </details>
      </li>
    </ol>
    <p class="sandbox__hint sandbox__limits">仅限本地同步算法练习，不支持 Node.js、npm、import、网络、文件系统或真实 Linux。SES 使用严格模式并冻结内建对象；没有内存硬配额，请勿运行来源不明的代码。日志与输出有界，不保存源码。</p>
  </section>
</template>

<style scoped>
.sandbox { --sandbox-syntax-violet: #6b21a8; --sandbox-syntax-blue: #1e40af; --sandbox-syntax-green: #166534; --sandbox-syntax-red: #991b1b; }
.dark .sandbox { --sandbox-syntax-violet: #d8b4fe; --sandbox-syntax-blue: #93c5fd; --sandbox-syntax-green: #86efac; --sandbox-syntax-red: #fca5a5; }
.sandbox { min-width: 0; max-width: 100%; margin: 24px 0; padding: 20px; border: 1px solid var(--vp-c-divider); border-radius: 12px; background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); overflow-wrap: anywhere; }
.sandbox__heading, .sandbox__toolbar, .sandbox__actions, .sandbox__summary, .sandbox__case-heading { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; min-width: 0; }
.sandbox__heading, .sandbox__toolbar { justify-content: space-between; }
.sandbox__heading h2 { margin: 0; padding: 0; border: 0; font-size: 20px; line-height: 1.5; }
.sandbox__language { padding: 2px 8px; border-radius: 6px; background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); font-size: 13px; }
.sandbox .sandbox__hint { margin: 10px 0; color: var(--vp-c-text-2); font-size: 13px; line-height: 1.65; }
.sandbox__editor { min-width: 0; max-width: 100%; overflow: hidden; border: 1px solid var(--vp-c-divider); border-radius: 8px; background: var(--vp-c-bg); }
.sandbox__editor--readonly { border-color: var(--vp-c-brand-1); }
.sandbox__editor textarea { display: block; box-sizing: border-box; width: 100%; min-width: 0; min-height: 264px; padding: 12px; resize: vertical; border: 0; border-radius: 6px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font: 14px/1.65 var(--vp-font-family-mono); tab-size: 2; overflow-wrap: anywhere; }
.sandbox__editor :deep(.cm-editor) { max-width: 100%; }
.sandbox__editor :deep(.cm-scroller) { max-height: 480px; }
.sandbox__editor :deep(.cm-content) { min-width: 0; }
.sandbox__editor :deep(.cm-panels) { max-width: 100%; overflow: auto; }
.sandbox__editor :deep(.cm-search) { white-space: normal; }
.sandbox__editor :deep(.cm-textfield) { max-width: 100%; box-sizing: border-box; color: var(--vp-c-text-1); background: var(--vp-c-bg); }
.sandbox__toolbar { margin: 12px 0; }
.sandbox__actions button { padding: 7px 12px; min-height: 40px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg); color: var(--vp-c-text-1); cursor: pointer; font: inherit; font-size: 14px; }
.sandbox__actions button:first-child { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-1); color: var(--vp-c-white); }
.sandbox__actions button:hover:not(:disabled) { border-color: var(--vp-c-brand-1); }
.sandbox__actions button:disabled { cursor: not-allowed; opacity: 0.55; }
.sandbox__actions button:focus-visible, .sandbox__logs summary:focus-visible, .sandbox__editor textarea:focus-visible, .sandbox__editor :deep(.cm-content:focus-visible), .sandbox__editor :deep(button:focus-visible), .sandbox__editor :deep(input:focus-visible) { outline: 2px solid var(--vp-c-brand-1); outline-offset: -2px; }
.sandbox__summary { padding: 10px 12px; border-radius: 6px; background: var(--vp-c-bg); font-size: 14px; }
.sandbox__summary [data-status='passed'], .sandbox__case[data-status='passed'] .sandbox__case-status { color: var(--vp-c-green-1); }
.sandbox__summary [data-status='running'], .sandbox__case[data-status='running'] .sandbox__case-status { color: var(--vp-c-brand-1); }
.sandbox .sandbox__error, .sandbox .sandbox__length--invalid { color: var(--vp-c-danger-1); white-space: pre-wrap; overflow-wrap: anywhere; }
.sandbox__cases { display: grid; gap: 12px; margin: 16px 0; padding: 0; list-style: none; }
.sandbox__cases > li { margin: 0; }
.sandbox__case { min-width: 0; padding: 14px; border: 1px solid var(--vp-c-divider); border-radius: 8px; background: var(--vp-c-bg); }
.sandbox__case-heading { font-size: 14px; }
.sandbox__case-status { margin-left: auto; font-weight: 600; }
.sandbox__case dl { display: grid; gap: 6px; margin: 12px 0 0; font-size: 13px; }
.sandbox__case dl > div { display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 8px; }
.sandbox__case dt { color: var(--vp-c-text-2); }
.sandbox__case dd { min-width: 0; margin: 0; }
.sandbox__case code, .sandbox__case pre { padding: 0; margin: 0; background: transparent; color: inherit; font: 13px/1.65 var(--vp-font-family-mono); white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }
.sandbox__case pre { max-height: 240px; overflow: auto; }
.sandbox__logs { margin-top: 12px; font-size: 13px; }
.sandbox__logs summary { padding: 4px 0; color: var(--vp-c-brand-1); cursor: pointer; }
.sandbox__logs ol { max-height: 240px; overflow: auto; padding-left: 24px; }
.sandbox .sandbox__limits { margin-bottom: 0; }
@media (max-width: 480px) {
  .sandbox { padding: 12px; }
  .sandbox__heading h2 { font-size: 18px; }
  .sandbox__case { padding: 10px; }
  .sandbox__summary { align-items: flex-start; flex-direction: column; gap: 4px; }
  .sandbox__actions { gap: 8px; }
  .sandbox__actions button { padding: 7px 10px; }
  .sandbox__case dl > div { grid-template-columns: minmax(0, 1fr); gap: 2px; }
}
@media (prefers-reduced-motion: reduce) {
  .sandbox__editor :deep(.cm-cursorLayer) { animation: none !important; }
}
</style>
