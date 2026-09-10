<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  id: string
  question: string
  options: { value: string; label: string }[]
  answer: string
  explanation?: string
}>()

const selected = ref('')
const state = ref<'idle' | 'wrong' | 'correct'>('idle')

function pick(value: string) {
  selected.value = value
  state.value = value === props.answer ? 'correct' : 'wrong'
}
</script>

<template>
  <fieldset class="learning-quiz" :data-state="state">
    <legend class="learning-quiz__question">{{ question }}</legend>
    <label
      v-for="option in options"
      :key="option.value"
      class="learning-quiz__option"
      :class="{ 'is-picked': selected === option.value }"
    >
      <input
        type="radio"
        :name="id"
        :value="option.value"
        :checked="selected === option.value"
        @change="pick(option.value)"
      >
      <span>{{ option.label }}</span>
    </label>
    <p class="learning-quiz__feedback" role="status" aria-live="polite">
      <template v-if="state === 'correct'">回答正确。<template v-if="explanation">{{ explanation }}</template></template>
      <template v-else-if="state === 'wrong'">不对，再想想——可以换个选项再试。</template>
      <template v-else>选择一个选项查看反馈。</template>
    </p>
  </fieldset>
</template>

<style scoped>
.learning-quiz { padding: 20px; margin: 20px 0; border: 1px solid var(--vp-c-divider); border-radius: 12px; background: var(--vp-c-bg-soft); }
.learning-quiz__question { padding: 0 6px; font-weight: 600; }
.learning-quiz__option { display: flex; gap: 10px; align-items: baseline; padding: 10px 12px; margin-top: 8px; border: 1px solid var(--vp-c-divider); border-radius: 8px; cursor: pointer; }
.learning-quiz__option:hover { border-color: var(--vp-c-brand-1); }
.learning-quiz__option:has(:focus-visible) { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }
.learning-quiz__option input { accent-color: var(--vp-c-brand-1); }
.learning-quiz[data-state='correct'] .is-picked { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.learning-quiz[data-state='wrong'] .is-picked { border-color: var(--vp-c-danger-1, #c44); }
.learning-quiz__feedback { margin: 14px 0 0; font-size: 14px; }
</style>
