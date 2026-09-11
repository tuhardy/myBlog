<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

interface TerminalLine {
  cmd: string
  out?: string
}

const MAX_ATTEMPTS_BEFORE_HINT = 2
const MAX_INPUT_LENGTH = 200

const props = withDefaults(defineProps<{
  id: string
  label: string
  script: TerminalLine[]
  prompt?: string
}>(), { prompt: '$' })

const mode = ref<'play' | 'type'>('play')
const cursor = ref(0)
const draft = ref('')
const attempts = ref(0)
const feedback = ref('')
const bodyEl = ref<HTMLElement>()
const inputEl = ref<HTMLInputElement>()

const done = computed(() => cursor.value >= props.script.length)
const expected = computed(() => props.script[cursor.value])
const showHint = computed(() => attempts.value >= MAX_ATTEMPTS_BEFORE_HINT)

const shownLines = computed(() =>
  props.script.slice(0, cursor.value).flatMap(entry => {
    const lines: { kind: 'cmd' | 'out'; text: string }[] = [{ kind: 'cmd', text: entry.cmd }]
    if (entry.out) lines.push({ kind: 'out', text: entry.out })
    return lines
  }),
)

// 教学演练的「等价写法」归一化：大小写、首尾与连续空白、=(), 两侧空格、
// 末尾分号、单双引号差异都不影响命中；其余字符逐字比对
function normalize(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*([=(),;])\s*/g, '$1')
    .replace(/;+\s*$/, '')
    .replace(/"/g, "'")
    .toLowerCase()
}

function setMode(next: 'play' | 'type') {
  mode.value = next
  feedback.value = ''
  draft.value = ''
  attempts.value = 0
}

function go(next: number) {
  cursor.value = Math.min(props.script.length, Math.max(0, next))
}

function reset() {
  cursor.value = 0
  feedback.value = ''
  draft.value = ''
  attempts.value = 0
}

function submit() {
  if (done.value) return
  if (normalize(draft.value) === normalize(expected.value.cmd)) {
    cursor.value += 1
    draft.value = ''
    attempts.value = 0
    feedback.value = ''
    return
  }
  attempts.value += 1
  feedback.value = showHint.value
    ? `提示：剧本期望的是 ${expected.value.cmd}`
    : '和剧本对不上，检查下命令再回车'
}

function fillExpected() {
  draft.value = expected.value?.cmd ?? ''
  inputEl.value?.focus()
}

watch(cursor, () => {
  nextTick(() => {
    if (bodyEl.value) bodyEl.value.scrollTop = bodyEl.value.scrollHeight
  })
})
</script>

<template>
  <section :id="id" class="learning-terminal" :aria-label="label" :data-mode="mode">
    <div class="learning-terminal__bar">
      <span class="learning-terminal__dots" aria-hidden="true"><i /><i /><i /></span>
      <span class="learning-terminal__title">{{ label }}</span>
      <span class="learning-terminal__modes" role="group" aria-label="终端模式">
        <button type="button" :aria-pressed="mode === 'play'" @click="setMode('play')">演示</button>
        <button type="button" :aria-pressed="mode === 'type'" @click="setMode('type')">动手敲</button>
      </span>
    </div>

    <div
      ref="bodyEl"
      class="learning-terminal__body"
      role="log"
      aria-live="polite"
      :aria-label="`${label}：输出区`"
      tabindex="0"
    >
      <p v-if="!shownLines.length" class="learning-terminal__empty">
        {{ mode === 'play' ? '点击「下一条」开始演示。' : '在下方输入命令并回车。' }}
      </p>
      <div v-for="(line, i) in shownLines" :key="i" class="learning-terminal__line">
        <template v-if="line.kind === 'cmd'"><span class="learning-terminal__prompt" aria-hidden="true">{{ prompt }}&nbsp;</span>{{ line.text }}</template>
        <pre v-else class="learning-terminal__out">{{ line.text }}</pre>
      </div>
      <p v-if="done" class="learning-terminal__done">— 剧本结束，共 {{ script.length }} 条命令 —</p>
    </div>

    <div v-if="mode === 'play'" class="learning-terminal__controls">
      <button type="button" :disabled="cursor === 0" @click="go(cursor - 1)">上一条</button>
      <span class="learning-terminal__progress">{{ cursor }} / {{ script.length }}</span>
      <button type="button" :disabled="done" @click="go(cursor + 1)">下一条</button>
      <button type="button" :disabled="cursor === 0" @click="reset">重播</button>
    </div>

    <form v-else class="learning-terminal__entry" @submit.prevent="submit">
      <label class="learning-terminal__sr" :for="`${id}-cmd`">输入命令并回车</label>
      <span class="learning-terminal__prompt" aria-hidden="true">{{ prompt }}&nbsp;</span>
      <input
        :id="`${id}-cmd`"
        ref="inputEl"
        v-model="draft"
        :disabled="done"
        :maxlength="MAX_INPUT_LENGTH"
        :placeholder="done ? '全部命令已完成' : '敲入命令后回车'"
        autocomplete="off"
        spellcheck="false"
      >
    </form>

    <p v-if="mode === 'type' && !done && feedback" class="learning-terminal__feedback" role="status">
      {{ feedback }}
      <button v-if="showHint" type="button" @click="fillExpected">帮我填入</button>
    </p>
  </section>
</template>

<style scoped>
.learning-terminal { padding: 20px; margin: 20px 0; border: 1px solid var(--vp-c-divider); border-radius: 12px; background: var(--vp-c-bg-soft); }
.learning-terminal__bar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.learning-terminal__dots { display: inline-flex; gap: 6px; }
.learning-terminal__dots i { width: 10px; height: 10px; border-radius: 50%; background: var(--vp-c-divider); }
.learning-terminal__title { flex: 1; font-weight: 600; font-size: 14px; color: var(--vp-c-text-2); }
.learning-terminal__modes { display: inline-flex; gap: 4px; padding: 3px; border: 1px solid var(--vp-c-divider); border-radius: 8px; background: var(--vp-c-bg); }
.learning-terminal__modes button { padding: 4px 12px; border-radius: 6px; color: var(--vp-c-text-2); font: inherit; font-size: 13px; cursor: pointer; }
.learning-terminal__modes button[aria-pressed='true'] { background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); font-weight: 600; }

.learning-terminal__body { min-height: 120px; max-height: 320px; overflow-y: auto; padding: 14px 16px; border-radius: 8px; background: #0f172a; color: #cbd5e1; font-family: var(--vp-font-family-mono); font-size: 13px; line-height: 1.7; }
.learning-terminal__line { white-space: pre-wrap; overflow-wrap: anywhere; }
.learning-terminal__prompt { color: #7dd3fc; font-weight: 700; }
.learning-terminal__out { margin: 0 0 8px; white-space: pre-wrap; overflow-wrap: anywhere; color: #94a3b8; }
.learning-terminal__empty, .learning-terminal__done { margin: 0; color: #64748b; }
.learning-terminal__done { text-align: center; }

.learning-terminal__controls { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
.learning-terminal__controls button { padding: 8px 18px; border: 1px solid var(--vp-c-brand-1); border-radius: 8px; background: transparent; color: var(--vp-c-brand-1); font: inherit; cursor: pointer; }
.learning-terminal__controls button:disabled { border-color: var(--vp-c-divider); color: var(--vp-c-text-3); cursor: not-allowed; }
.learning-terminal__progress { font-variant-numeric: tabular-nums; color: var(--vp-c-text-2); font-size: 14px; }

.learning-terminal__entry { display: flex; align-items: baseline; margin-top: 12px; padding: 10px 16px; border-radius: 8px; background: #0f172a; font-family: var(--vp-font-family-mono); font-size: 13px; }
.learning-terminal__entry input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: #cbd5e1; font: inherit; caret-color: #7dd3fc; }
.learning-terminal__entry input::placeholder { color: #475569; }
.learning-terminal__entry:focus-within { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }

.learning-terminal__feedback { margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.learning-terminal__feedback button { margin-left: 10px; padding: 2px 10px; border: 1px solid var(--vp-c-brand-1); border-radius: 6px; background: transparent; color: var(--vp-c-brand-1); font: inherit; font-size: 13px; cursor: pointer; }

.learning-terminal__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
.learning-terminal button:focus-visible, .learning-terminal input:focus-visible, .learning-terminal__body:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }
</style>
