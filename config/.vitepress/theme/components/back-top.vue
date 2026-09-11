<script setup lang="ts">
/**
 * back-top.vue — 进度环回顶按钮（右下角悬浮 FAB）
 *
 *  1. 白卡圆钮 + hairline 边框 + 品牌色 SVG 进度环，延续杂志纸感语言；
 *  2. 环用 stroke-dashoffset 驱动，-90° 旋转使进度从正上方开始顺时针走；
 *  3. 滚动超过 SHOW_THRESHOLD 才淡入上浮；隐藏时 visibility:hidden 兼收
 *     pointer-events 与键盘焦点，不会拦到不可见状态；
 *  4. 滚动监听 rAF 节流 + passive；prefers-reduced-motion 下回顶瞬移、无过渡；
 *  5. 移动端保留（长文回顶更有用），缩小尺寸避免遮挡正文。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

// 滚动超过此像素才显示按钮
const SHOW_THRESHOLD = 400
// 进度环半径（与 viewBox 44 配套：环位于 22±19，stroke 2.5 不外溢）
const RADIUS = 19
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const progress = ref(0)
const visible = ref(false)

let raf = 0
let ticking = false
let reducedMq: MediaQueryList | null = null

const dashOffset = computed(() => CIRCUMFERENCE * (1 - progress.value))

function update() {
  ticking = false
  const max = document.documentElement.scrollHeight - window.innerHeight
  const y = window.scrollY
  progress.value = max > 4 ? Math.min(1, Math.max(0, y / max)) : 0
  visible.value = y > SHOW_THRESHOLD
  raf = 0
}

function onScroll() {
  if (!ticking) {
    ticking = true
    raf = requestAnimationFrame(update)
  }
}

function toTop() {
  window.scrollTo({
    top: 0,
    behavior: reducedMq?.matches ? 'auto' : 'smooth',
  })
}

onMounted(() => {
  reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)')
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  update()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  if (raf) cancelAnimationFrame(raf)
})
</script>

<template>
  <button
    type="button"
    class="back-top"
    :class="{ 'is-visible': visible }"
    aria-label="回到顶部"
    title="回到顶部"
    @click="toTop"
  >
    <svg class="back-top__ring" viewBox="0 0 44 44" aria-hidden="true">
      <circle class="back-top__track" cx="22" cy="22" :r="RADIUS" />
      <circle
        class="back-top__arc"
        cx="22"
        cy="22"
        :r="RADIUS"
        :stroke-dasharray="CIRCUMFERENCE"
        :stroke-dashoffset="dashOffset"
      />
    </svg>
    <svg class="back-top__arrow" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 5h14M12 20V8m0 0-5 5m5-5 5 5"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</template>

<style scoped>
.back-top {
  position: fixed;
  right: 28px;
  bottom: 32px;
  z-index: 50;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 50%;
  background: #ffffff;
  color: var(--vp-c-brand-1);
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.1);
  opacity: 0;
  translate: 0 12px;
  visibility: hidden;
  transition:
    opacity 0.3s ease,
    translate 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
    visibility 0s linear 0.3s,
    border-color 0.25s ease,
    box-shadow 0.3s ease;
}
.back-top.is-visible {
  opacity: 1;
  translate: 0 0;
  visibility: visible;
  transition:
    opacity 0.3s ease,
    translate 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
    visibility 0s,
    border-color 0.25s ease,
    box-shadow 0.3s ease;
}
.back-top:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 10px 28px rgba(44, 62, 80, 0.16);
}
.back-top:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 3px;
}

/* 进度环：-90° 旋转使弧线从正上方起步 */
.back-top__ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.back-top__track {
  fill: none;
  stroke: rgba(15, 23, 42, 0.08);
  stroke-width: 2.5;
}
.back-top__arc {
  fill: none;
  stroke: var(--vp-c-brand-1);
  stroke-width: 2.5;
  stroke-linecap: round;
  /* 滚动经 rAF 已较密，小过渡仅作平滑兜底 */
  transition: stroke-dashoffset 0.12s linear;
}

.back-top__arrow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  transform: translate(-50%, -50%);
}

/* ===== 暗色模式：深纸卡圆钮 ===== */
.dark .back-top {
  background: rgba(38, 40, 46, 0.85);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}
.dark .back-top__track {
  stroke: rgba(255, 255, 255, 0.12);
}

@media (max-width: 640px) {
  .back-top {
    right: 16px;
    bottom: 20px;
    width: 42px;
    height: 42px;
  }
  .back-top__arrow {
    width: 18px;
    height: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .back-top,
  .back-top__arc {
    transition: none;
  }
}

@media print {
  .back-top {
    display: none;
  }
}
</style>
