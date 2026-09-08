<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const DEFAULT_DURATION = 600
const MAX_DECIMALS = 6
const props = withDefaults(defineProps<{
  label: string
  value: number
  unit?: string
  duration?: number
  decimals?: number
}>(), { unit: '', duration: DEFAULT_DURATION, decimals: 0 })

const target = computed(() => Number.isFinite(props.value) ? props.value : 0)
const precision = computed(() => Math.min(MAX_DECIMALS, Math.max(0, Math.trunc(props.decimals))))
const displayed = ref(target.value)
let mounted = false
let frame = 0
let media: MediaQueryList | undefined

function animate() {
  if (!mounted) return
  cancelAnimationFrame(frame)
  const duration = Number.isFinite(props.duration) ? Math.max(0, props.duration) : DEFAULT_DURATION
  if (media?.matches || duration === 0) {
    displayed.value = target.value
    return
  }
  const start = performance.now()
  const from = displayed.value
  const to = target.value
  function tick(now: number) {
    const progress = Math.min(1, (now - start) / duration)
    displayed.value = from + (to - from) * progress
    if (progress < 1) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
}

watch([target, () => props.duration], animate)
onMounted(() => {
  mounted = true
  media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', animate)
  displayed.value = 0
  animate()
})
onBeforeUnmount(() => {
  mounted = false
  if (frame) cancelAnimationFrame(frame)
  media?.removeEventListener('change', animate)
})
</script>

<template>
  <div class="learning-counter" role="group" :aria-label="`${label}：${target.toFixed(precision)}${unit}`">
    <span class="learning-counter__label" aria-hidden="true">{{ label }}</span>
    <span class="learning-counter__number" aria-hidden="true">{{ displayed.toFixed(precision) }}<small>{{ unit }}</small></span>
  </div>
</template>

<style scoped>
.learning-counter { display: flex; flex-direction: column; gap: 8px; padding: 20px; margin: 20px 0; border-radius: 12px; background: var(--vp-c-brand-soft); }
.learning-counter__label { color: var(--vp-c-text-2); font-size: 14px; }
.learning-counter__number { color: var(--vp-c-brand-1); font-size: 32px; line-height: 1.4; font-weight: 700; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.learning-counter__number small { margin-left: 8px; font-size: 16px; font-weight: 400; }
</style>
