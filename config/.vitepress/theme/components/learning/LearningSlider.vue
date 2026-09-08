<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  modelValue: number
  min: number
  max: number
  step?: number
  unit?: string
}>(), { step: 1, unit: '' })

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

function update(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).valueAsNumber)
}
</script>

<template>
  <label class="learning-slider">
    <span class="learning-slider__heading">
      <span>{{ label }}</span>
      <span aria-hidden="true">{{ modelValue }}{{ unit }}</span>
    </span>
    <input
      type="range"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :aria-label="label"
      :aria-valuetext="`${modelValue}${unit}`"
      @input="update"
    >
  </label>
</template>

<style scoped>
.learning-slider { display: block; padding: 20px; margin: 20px 0; border: 1px solid var(--vp-c-divider); border-radius: 12px; background: var(--vp-c-bg-soft); }
.learning-slider__heading { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; font-weight: 600; }
.learning-slider input { display: block; width: 100%; min-height: 44px; accent-color: var(--vp-c-brand-1); cursor: pointer; }
.learning-slider input:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 4px; }
</style>
