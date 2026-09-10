<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineProps<{ term: string; content: string }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function onDocClick(event: MouseEvent) {
  if (open.value && root.value && !root.value.contains(event.target as Node)) open.value = false
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <span ref="root" class="learning-popover">
    <button type="button" class="learning-popover__trigger" :aria-expanded="open" @click="open = !open">{{ term }}</button>
    <span v-if="open" class="learning-popover__card" role="tooltip">{{ content }}</span>
  </span>
</template>

<style scoped>
.learning-popover { position: relative; display: inline-block; }
.learning-popover__trigger { padding: 0 2px; border: 0; border-bottom: 1px dashed var(--vp-c-brand-1); background: transparent; color: var(--vp-c-brand-1); font: inherit; cursor: help; }
.learning-popover__trigger:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }
.learning-popover__card { position: absolute; z-index: 30; inset-inline-start: 0; top: calc(100% + 8px); box-sizing: border-box; width: max-content; max-width: min(320px, 80vw); padding: 12px 16px; border: 1px solid var(--vp-c-divider); border-radius: 10px; background: var(--vp-c-bg); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16); font-size: 14px; line-height: 1.7; white-space: normal; }
</style>
