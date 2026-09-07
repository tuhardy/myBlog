<script setup lang="ts">
/**
 * progress-breath.vue — 呼吸式阅读进度条
 *
 * 与传统生硬进度条的区别：
 *  1. 顶部 3px 品牌色渐变条，尾部用 mask-image 线性渐隐（实色 80% → 透明），
 *     像一口气轻轻吐出去，而不是被一刀切断；
 *  2. 进度通过 transform: scaleX() 驱动，只走合成层，不触发重排；
 *  3. 滚动到达页面底部时，进度条「心跳」闪烁两次（opacity 明暗交替），
 *     随后整体淡出消失；回滚离开底部自动复位；
 *  4. 页面顶部 / 移动端 / prefers-reduced-motion 下隐藏。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

const wrapRef = ref<HTMLElement | null>(null)
const barRef = ref<HTMLElement | null>(null)

let raf = 0
let ticking = false
let finished = false

function update() {
  ticking = false
  const docEl = document.documentElement
  const max = docEl.scrollHeight - window.innerHeight
  // max 很小（内容不足一屏）时视为 0，避免抖动
  const progress = max > 4 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0

  if (barRef.value) {
    barRef.value.style.transform = `scaleX(${progress.toFixed(4)})`
  }

  const wrap = wrapRef.value
  if (wrap) {
    wrap.classList.toggle('is-visible', progress > 0.005)

    const atEnd = progress >= 0.995
    if (atEnd && !finished) {
      // 到达底部 → 触发心跳动画（动画结束后停在 opacity:0）
      finished = true
      wrap.classList.add('is-finished')
    } else if (!atEnd && finished) {
      // 离开底部 → 复位，下次到底再次心跳
      finished = false
      wrap.classList.remove('is-finished')
    }
  }
  raf = 0
}

function onScroll() {
  if (!ticking) {
    ticking = true
    raf = requestAnimationFrame(update)
  }
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  update()
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})
</script>

<template>
  <div ref="wrapRef" class="progress-breath" aria-hidden="true">
    <div ref="barRef" class="progress-breath__bar" />
  </div>
</template>

<style scoped>
/* 固定在视口最顶部，z-index 高于导航栏（nav ≈ 64） */
.progress-breath {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 200;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.4s ease;
}
.progress-breath.is-visible {
  opacity: 1;
}

.progress-breath__bar {
  height: 100%;
  transform: scaleX(0) translateZ(0);
  transform-origin: left center;
  background: linear-gradient(
    90deg,
    var(--vp-c-brand-1, #2c3e50),
    var(--vp-c-brand-2, #34495e)
  );
  /* 尾部渐隐：前 80% 实色，后 20% 线性消散 */
  -webkit-mask-image: linear-gradient(to right, #000 80%, rgba(0, 0, 0, 0));
  mask-image: linear-gradient(to right, #000 80%, rgba(0, 0, 0, 0));
  /* 品牌色微光，让细线在浅灰画布上也能被感知 */
  box-shadow: 0 0 12px rgba(44, 62, 80, 0.35);
  will-change: transform;
}

/* 到达底部：心跳闪烁两次（明 → 暗 → 明 → 暗 → 明），随后淡出 */
.progress-breath.is-finished {
  animation: progress-heartbeat 1.5s ease-in-out forwards;
}
@keyframes progress-heartbeat {
  0% {
    opacity: 1;
  }
  18% {
    opacity: 0.2;
  }
  36% {
    opacity: 1;
  }
  54% {
    opacity: 0.2;
  }
  72% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* 移动端隐藏，保持干净 */
@media (max-width: 768px) {
  .progress-breath {
    display: none;
  }
}
</style>
