<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

interface StepperStep {
  lines: number[]
  note: string
}

const props = defineProps<{
  id: string
  label: string
  code: string
  steps: StepperStep[]
}>()

const index = ref(0)
const codeEl = ref<HTMLElement>()

const codeLines = computed(() => props.code.split('\n'))
const last = computed(() => Math.max(0, props.steps.length - 1))
const activeLines = computed(() => {
  const max = codeLines.value.length
  return new Set((props.steps[index.value]?.lines ?? []).filter(line => line >= 1 && line <= max))
})

function go(next: number) {
  index.value = Math.min(last.value, Math.max(0, next))
}

watch(index, () => {
  nextTick(() => {
    const box = codeEl.value
    const line = box?.querySelector<HTMLElement>('.is-active')
    if (!box || !line) return
    const boxRect = box.getBoundingClientRect()
    const lineRect = line.getBoundingClientRect()
    if (lineRect.top < boxRect.top) box.scrollTop -= boxRect.top - lineRect.top
    else if (lineRect.bottom > boxRect.bottom) box.scrollTop += lineRect.bottom - boxRect.bottom
  })
})
</script>

<template>
  <section :id="id" class="learning-stepper" :aria-label="label" :data-step="index">
    <div ref="codeEl" class="learning-stepper__code" tabindex="0" role="group" :aria-label="`${label}：代码区`">
      <div
        v-for="(line, i) in codeLines"
        :key="i"
        class="learning-stepper__line"
        :class="{ 'is-active': activeLines.has(i + 1) }"
      >
        <span class="learning-stepper__no" aria-hidden="true">{{ i + 1 }}</span>
        <code>{{ line || ' ' }}</code>
      </div>
    </div>
    <p class="learning-stepper__note" role="status" aria-live="polite">
      <strong>{{ index + 1 }} / {{ steps.length }}</strong>
      {{ steps[index]?.note }}
    </p>
    <div class="learning-stepper__nav">
      <button type="button" :disabled="index === 0" @click="go(index - 1)">上一步</button>
      <button type="button" :disabled="index === last" @click="go(index + 1)">下一步</button>
    </div>
  </section>
</template>

<style scoped>
.learning-stepper { padding: 20px; margin: 20px 0; border: 1px solid var(--vp-c-divider); border-radius: 12px; background: var(--vp-c-bg-soft); }
.learning-stepper__code { max-height: 320px; overflow: auto; border: 1px solid var(--vp-c-divider); border-radius: 8px; background: var(--vp-c-bg); font-family: var(--vp-font-family-mono); font-size: 13px; line-height: 1.7; }
.learning-stepper__line { display: flex; opacity: 0.45; transition: opacity 0.2s ease, background-color 0.2s ease; }
.learning-stepper__line.is-active { opacity: 1; background: var(--vp-c-brand-soft); box-shadow: inset 3px 0 0 var(--vp-c-brand-1); }
.learning-stepper__no { flex: 0 0 2.5em; padding-right: 1em; text-align: right; user-select: none; color: var(--vp-c-text-3); font-variant-numeric: tabular-nums; }
.learning-stepper__line code { flex: 1; padding-right: 16px; white-space: pre; background: transparent; color: inherit; }
.learning-stepper__note { margin: 12px 0 0; font-size: 14px; color: var(--vp-c-text-2); }
.learning-stepper__note strong { margin-right: 8px; color: var(--vp-c-text-1); font-variant-numeric: tabular-nums; }
.learning-stepper__nav { display: flex; gap: 12px; margin-top: 12px; }
.learning-stepper__nav button { padding: 8px 18px; border: 1px solid var(--vp-c-brand-1); border-radius: 8px; background: transparent; color: var(--vp-c-brand-1); font: inherit; cursor: pointer; }
.learning-stepper__nav button:disabled { border-color: var(--vp-c-divider); color: var(--vp-c-text-3); cursor: not-allowed; }
.learning-stepper button:focus-visible, .learning-stepper__code:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  .learning-stepper__line { transition: none; }
}
</style>
