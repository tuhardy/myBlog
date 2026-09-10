<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  id: string
  label: string
  steps: { value: string; label: string }[]
  modelValue: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const index = computed(() => Math.max(0, props.steps.findIndex(step => step.value === props.modelValue)))

function go(next: number) {
  const step = props.steps[next]
  if (step) emit('update:modelValue', step.value)
}
</script>

<template>
  <section :id="id" class="learning-steps" :aria-label="label" :data-step="modelValue">
    <ol class="learning-steps__dots" role="list">
      <li v-for="(step, i) in steps" :key="step.value">
        <button
          type="button"
          class="learning-steps__dot"
          :aria-current="i === index ? 'step' : undefined"
          :aria-label="`第 ${i + 1} 步：${step.label}`"
          @click="go(i)"
        >{{ i + 1 }}</button>
      </li>
    </ol>
    <div class="learning-steps__panel" role="group" :aria-label="`第 ${index + 1} 步，共 ${steps.length} 步`">
      <h3 class="learning-steps__title">{{ index + 1 }} / {{ steps.length }} · {{ steps[index]?.label }}</h3>
      <slot :name="modelValue" />
    </div>
    <div class="learning-steps__nav">
      <button type="button" :disabled="index === 0" @click="go(index - 1)">上一步</button>
      <button type="button" :disabled="index === steps.length - 1" @click="go(index + 1)">下一步</button>
    </div>
  </section>
</template>

<style scoped>
.learning-steps { padding: 20px; margin: 20px 0; border: 1px solid var(--vp-c-divider); border-radius: 12px; background: var(--vp-c-bg-soft); }
.learning-steps__dots { display: flex; flex-wrap: wrap; gap: 10px; padding: 0; margin: 0 0 16px; list-style: none; }
.learning-steps__dot { width: 36px; height: 36px; border: 1px solid var(--vp-c-divider); border-radius: 50%; background: var(--vp-c-bg); color: var(--vp-c-text-2); font: inherit; font-variant-numeric: tabular-nums; cursor: pointer; }
.learning-steps__dot[aria-current='step'] { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-1); color: var(--vp-c-bg); font-weight: 700; }
.learning-steps__dot:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }
.learning-steps__panel { min-height: 96px; }
.learning-steps__title { margin: 0 0 8px; font-size: 15px; font-weight: 600; color: var(--vp-c-text-2); }
.learning-steps__nav { display: flex; gap: 12px; margin-top: 16px; }
.learning-steps__nav button { padding: 8px 18px; border: 1px solid var(--vp-c-brand-1); border-radius: 8px; background: transparent; color: var(--vp-c-brand-1); font: inherit; cursor: pointer; }
.learning-steps__nav button:disabled { border-color: var(--vp-c-divider); color: var(--vp-c-text-3); cursor: not-allowed; }
.learning-steps__nav button:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }
</style>
