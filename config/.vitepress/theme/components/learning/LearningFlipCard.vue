<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ question: string; answer: string }>()
const flipped = ref(false)
</script>

<template>
  <div class="learning-flip">
    <button
      type="button"
      class="learning-flip__toggle"
      :aria-pressed="flipped"
      @click="flipped = !flipped"
    >{{ flipped ? '返回问题' : '翻面查看答案' }}</button>
    <div class="learning-flip__card" :class="{ 'is-flipped': flipped }">
      <div class="learning-flip__inner">
        <div class="learning-flip__face learning-flip__front" role="region" aria-label="自测问题" :aria-hidden="flipped" :inert="flipped" :tabindex="flipped ? -1 : 0">
          <strong>先想一想</strong>
          <p>{{ question }}</p>
        </div>
        <div class="learning-flip__face learning-flip__back" role="region" aria-label="自测答案" :aria-hidden="!flipped" :inert="!flipped" :tabindex="flipped ? 0 : -1">
          <strong>答案与解释</strong>
          <p>{{ answer }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.learning-flip { margin: 24px 0; }
.learning-flip__toggle { padding: 8px 16px; margin-bottom: 12px; border: 1px solid var(--vp-c-brand-1); border-radius: 8px; color: var(--vp-c-brand-1); font: inherit; cursor: pointer; }
.learning-flip__toggle:focus-visible, .learning-flip__face:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }
.learning-flip__card { width: 100%; height: 240px; perspective: 1000px; }
.learning-flip__inner { position: relative; width: 100%; height: 100%; transition: transform 0.5s ease; transform-style: preserve-3d; }
.is-flipped .learning-flip__inner { transform: rotateY(180deg); }
.learning-flip__face { box-sizing: border-box; position: absolute; inset: 0; width: 100%; height: 100%; padding: 24px; overflow: auto; overflow-wrap: anywhere; border: 1px solid var(--vp-c-divider); border-radius: 12px; backface-visibility: hidden; -webkit-backface-visibility: hidden; background: var(--vp-c-bg-soft); }
.learning-flip__face p { margin: 12px 0 0; }
.learning-flip__back { transform: rotateY(180deg); background: var(--vp-c-brand-soft); }
@media (prefers-reduced-motion: reduce) {
  .learning-flip__inner { transition: none; }
}
</style>
