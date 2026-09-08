<script setup lang="ts">
interface TabOption {
  value: string
  label: string
}

const props = defineProps<{
  id: string
  label: string
  modelValue: string
  options: TabOption[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function navigate(event: KeyboardEvent, index: number) {
  const last = props.options.length - 1
  const destinations: Record<string, number> = {
    ArrowRight: index === last ? 0 : index + 1,
    ArrowLeft: index === 0 ? last : index - 1,
    Home: 0,
    End: last,
  }
  const target = destinations[event.key]
  if (target === undefined || !props.options[target]) return
  event.preventDefault()
  emit('update:modelValue', props.options[target].value)
  const button = event.currentTarget as HTMLButtonElement
  button.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[target]?.focus()
}
</script>

<template>
  <section class="learning-tabs" :aria-label="label">
    <div class="learning-tabs__list" role="tablist" :aria-label="label">
      <button
        v-for="(option, index) in options"
        :id="`${id}-tab-${option.value}`"
        :key="option.value"
        type="button"
        role="tab"
        :aria-selected="modelValue === option.value"
        :aria-controls="`${id}-panel-${option.value}`"
        :tabindex="modelValue === option.value ? 0 : -1"
        @click="emit('update:modelValue', option.value)"
        @keydown="navigate($event, index)"
      >{{ option.label }}</button>
    </div>
    <div
      v-for="option in options"
      v-show="modelValue === option.value"
      :id="`${id}-panel-${option.value}`"
      :key="option.value"
      class="learning-tabs__panel"
      role="tabpanel"
      tabindex="0"
      :aria-labelledby="`${id}-tab-${option.value}`"
    >
      <slot :name="option.value" />
    </div>
  </section>
</template>

<style scoped>
.learning-tabs { margin: 24px 0; border: 1px solid var(--vp-c-divider); border-radius: 12px; overflow: hidden; }
.learning-tabs__list { display: flex; flex-wrap: wrap; gap: 4px; padding: 8px; background: var(--vp-c-bg-soft); }
.learning-tabs__list button { padding: 8px 16px; border-radius: 6px; color: var(--vp-c-text-1); cursor: pointer; font: inherit; }
.learning-tabs__list button[aria-selected='true'] { background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); font-weight: 600; }
.learning-tabs__panel { padding: 16px 20px; overflow-wrap: anywhere; }
.learning-tabs__list button:focus-visible, .learning-tabs__panel:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: -2px; }
</style>
