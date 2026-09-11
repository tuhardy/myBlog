<script setup lang="ts">
import { ref } from 'vue'

interface Hotspot {
  x: number
  y: number
  w: number
  h: number
  title: string
  content: string
}

const props = defineProps<{
  id: string
  label: string
  spots: Hotspot[]
  image?: string
  alt?: string
}>()

const active = ref(-1)

function toggle(index: number) {
  active.value = active.value === index ? -1 : index
}
</script>

<template>
  <figure :id="id" class="learning-hotspot" :aria-label="label" :data-active="active" @keydown.esc="active = -1">
    <div class="learning-hotspot__stage">
      <slot><img v-if="image" :src="image" :alt="alt || label" class="learning-hotspot__img"></slot>
      <button
        v-for="(spot, i) in spots"
        :key="i"
        type="button"
        class="learning-hotspot__region"
        :class="{ 'is-active': i === active }"
        :style="{ left: `${spot.x}%`, top: `${spot.y}%`, width: `${spot.w}%`, height: `${spot.h}%` }"
        :aria-label="`标记 ${i + 1}：${spot.title}`"
        :aria-pressed="i === active"
        @click="toggle(i)"
      />
    </div>
    <figcaption class="learning-hotspot__caption" role="status" aria-live="polite">
      <template v-if="active >= 0">
        <strong>{{ active + 1 }} · {{ spots[active].title }}</strong>
        <span>{{ spots[active].content }}</span>
      </template>
      <template v-else>点击图中区域查看注解。</template>
    </figcaption>
  </figure>
</template>

<style scoped>
.learning-hotspot { padding: 20px; margin: 20px 0; border: 1px solid var(--vp-c-divider); border-radius: 12px; background: var(--vp-c-bg-soft); }
.learning-hotspot__stage { position: relative; overflow: auto; }
.learning-hotspot__img { display: block; width: 100%; height: auto; border-radius: 8px; }
/* 可点区域：闲置时仅淡虚线框提示可点；激活时整块填色 */
.learning-hotspot__region { position: absolute; z-index: 1; border: 1.5px dashed color-mix(in srgb, var(--vp-c-brand-1) 40%, transparent); border-radius: 8px; background: transparent; cursor: pointer; transition: background-color 0.2s ease, border-color 0.2s ease; }
.learning-hotspot__region:hover { background: color-mix(in srgb, var(--vp-c-brand-1) 8%, transparent); }
.learning-hotspot__region.is-active { border-style: solid; border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.learning-hotspot__region:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }
.learning-hotspot__caption { display: block; min-height: 2.6em; margin: 12px 0 0; font-size: 14px; line-height: 1.6; color: var(--vp-c-text-2); }
.learning-hotspot__caption strong { display: block; color: var(--vp-c-text-1); }
.learning-hotspot__caption span { display: block; }
.learning-hotspot:focus-visible { outline: none; }
@media (prefers-reduced-motion: reduce) {
  .learning-hotspot__region { transition: none; }
}
</style>
