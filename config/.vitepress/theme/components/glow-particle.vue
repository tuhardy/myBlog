<script setup lang="ts">
/**
 * glow-particle.vue — 智能光标跟随「呼吸粒子」背景层
 *
 *  1. 最多 3 个低饱和莫兰迪色渐变光斑，常驻页面背景层；
 *  2. 每个光斑自带 27s~34s 的缓慢漂移动画（CSS keyframes，仅 transform）；
 *  3. 鼠标移动时，光斑以 1~2px 级别的惯性视差跟随（rAF + 线性插值 lerp），
 *     不同光斑 depth 不同，产生纵深感；
 *  4. 外层 .glow-blob 负责 JS 视差位移，内层 .glow-blob__core 负责 CSS 漂移，
 *     两层 transform 互不冲突；
 *  5. 移动端（≤768px）与 prefers-reduced-motion 关闭：JS 层不绑定监听，
 *     且监听窗口尺寸变化动态启停（避免跨断点缩放后状态陈旧）；
 *  6. 鼠标静止、lerp 收敛后自动停 rAF，pointermove 时再唤醒，零空转。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface BlobConf {
  style: Record<string, string>
  depth: number
  drift: 'a' | 'b' | 'c'
}

const BLOBS: BlobConf[] = [
  {
    depth: 16,
    drift: 'a',
    style: {
      top: '-12%',
      left: '-8%',
      width: '460px',
      height: '460px',
      '--blob-color': 'rgba(44, 62, 80, 0.38)',
    },
  },
  {
    depth: 24,
    drift: 'b',
    style: {
      top: '26%',
      right: '-12%',
      width: '540px',
      height: '540px',
      '--blob-color': 'rgba(100, 126, 158, 0.30)',
    },
  },
  {
    depth: 12,
    drift: 'c',
    style: {
      bottom: '-16%',
      left: '24%',
      width: '480px',
      height: '480px',
      '--blob-color': 'rgba(150, 162, 180, 0.22)',
    },
  },
]

const layerRef = ref<HTMLElement | null>(null)

let raf = 0
// 收敛阈值：lerp 残余小于此值视为到达，停 rAF
const EPS = 0.0005
// 惯性系数
const LERP = 0.045
let targetX = 0
let targetY = 0
let currentX = 0
let currentY = 0

let reducedMq: MediaQueryList | null = null
let widthMq: MediaQueryList | null = null

function onPointerMove(e: PointerEvent) {
  targetX = (e.clientX / window.innerWidth - 0.5) * 2
  targetY = (e.clientY / window.innerHeight - 0.5) * 2
  ensureLoop()
}

/** 保证 rAF 循环在跑（pointermove 时若已停则唤醒） */
function ensureLoop() {
  if (!raf) raf = requestAnimationFrame(loop)
}

function loop() {
  currentX += (targetX - currentX) * LERP
  currentY += (targetY - currentY) * LERP
  const el = layerRef.value
  if (el) {
    el.style.setProperty('--mx', currentX.toFixed(4))
    el.style.setProperty('--my', currentY.toFixed(4))
  }
  // 收敛后停表，下次 pointermove 再唤醒
  if (
    Math.abs(targetX - currentX) < EPS &&
    Math.abs(targetY - currentY) < EPS
  ) {
    raf = 0
    return
  }
  raf = requestAnimationFrame(loop)
}

function isDisabled(): boolean {
  return (
    reducedMq?.matches ||
    widthMq?.matches ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function start() {
  if (isDisabled()) return
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  ensureLoop()
}

function stop() {
  window.removeEventListener('pointermove', onPointerMove)
  if (raf) {
    cancelAnimationFrame(raf)
    raf = 0
  }
}

/** 媒体查询变化：跨断点缩放时动态启停 */
function onMqChange() {
  if (isDisabled()) stop()
  else start()
}

onMounted(() => {
  reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)')
  widthMq = window.matchMedia('(max-width: 768px)')
  reducedMq.addEventListener('change', onMqChange)
  widthMq.addEventListener('change', onMqChange)
  start()
})

onBeforeUnmount(() => {
  reducedMq?.removeEventListener('change', onMqChange)
  widthMq?.removeEventListener('change', onMqChange)
  stop()
})
</script>

<template>
  <div ref="layerRef" class="glow-layer" aria-hidden="true">
    <div
      v-for="(b, i) in BLOBS"
      :key="i"
      class="glow-blob"
      :class="`glow-blob--${b.drift}`"
      :style="{ ...b.style, '--depth': `${b.depth}px` }"
    >
      <div class="glow-blob__core" />
    </div>
  </div>
</template>

<style scoped>
.glow-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.glow-blob {
  position: absolute;
  border-radius: 50%;
  will-change: transform;
  transform: translate3d(
    calc(var(--mx, 0) * var(--depth, 12px)),
    calc(var(--my, 0) * var(--depth, 12px)),
    0
  );
}

.glow-blob__core {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(
    circle at center,
    var(--blob-color, rgba(44, 62, 80, 0.5)) 0%,
    rgba(0, 0, 0, 0) 68%
  );
  will-change: transform, opacity;
}

.glow-blob--a .glow-blob__core { animation: glow-drift-a 27s ease-in-out infinite; }
.glow-blob--b .glow-blob__core { animation: glow-drift-b 34s ease-in-out infinite; }
.glow-blob--c .glow-blob__core { animation: glow-drift-c 30s ease-in-out infinite; }

@keyframes glow-drift-a {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50%      { transform: translate3d(52px, 36px, 0) scale(1.1); }
}
@keyframes glow-drift-b {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1.05); }
  50%      { transform: translate3d(-60px, -28px, 0) scale(0.94); }
}
@keyframes glow-drift-c {
  0%, 100% { transform: translate3d(0, 0, 0) scale(0.98); }
  50%      { transform: translate3d(34px, -46px, 0) scale(1.08); }
}

.dark .glow-layer { opacity: 0.45; }

@media (max-width: 768px) {
  .glow-layer { display: none; }
}
</style>
