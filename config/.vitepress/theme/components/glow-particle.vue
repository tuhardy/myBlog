<script setup lang="ts">
/**
 * glow-particle.vue — 智能光标跟随「呼吸粒子」背景层
 *
 * 设计要点：
 *  1. 最多 3 个低饱和莫兰迪色渐变光斑，常驻页面背景层；
 *  2. 每个光斑自带 27s~34s 的缓慢漂移动画（CSS keyframes，仅 transform）；
 *  3. 鼠标移动时，光斑以 1~2px 级别的惯性视差跟随（rAF + 线性插值 lerp），
 *     不同光斑 depth 不同，产生纵深感；
 *  4. 外层 .glow-blob 负责 JS 视差位移，内层 .glow-blob__core 负责 CSS 漂移，
 *     两层 transform 互不冲突；
 *  5. 移动端（≤768px）与 prefers-reduced-motion 直接关闭，保持干净与性能。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface BlobConf {
  /** 定位 + 尺寸 + 颜色（CSS 变量 --blob-color 供 radial-gradient 使用） */
  style: Record<string, string>
  /** 视差深度（px）：鼠标从屏幕中央移到边缘时的最大位移 */
  depth: number
  /** 漂移动画组（a/b/c 三套 keyframes，方向周期各不相同） */
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
      '--blob-color': 'rgba(44, 62, 80, 0.38)',   // 品牌墨蓝石板
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
      '--blob-color': 'rgba(100, 126, 158, 0.30)', // 雾蓝灰（与石板蓝同冷色系）
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
      '--blob-color': 'rgba(150, 162, 180, 0.22)', // 冷石灰（极淡的层次色，不抢戏）
    },
  },
]

const layerRef = ref<HTMLElement | null>(null)

let raf = 0
let enabled = false
// 目标位置（鼠标归一化 -1 ~ 1）与当前位置（lerp 逼近目标，产生惯性）
let targetX = 0
let targetY = 0
let currentX = 0
let currentY = 0

/** 惯性系数：越小越「慵懒」。0.045 ≈ 20 帧左右追上目标 */
const LERP = 0.045

function onPointerMove(e: PointerEvent) {
  targetX = (e.clientX / window.innerWidth - 0.5) * 2
  targetY = (e.clientY / window.innerHeight - 0.5) * 2
}

function loop() {
  currentX += (targetX - currentX) * LERP
  currentY += (targetY - currentY) * LERP
  const el = layerRef.value
  if (el) {
    el.style.setProperty('--mx', currentX.toFixed(4))
    el.style.setProperty('--my', currentY.toFixed(4))
  }
  raf = requestAnimationFrame(loop)
}

onMounted(() => {
  // 尊重系统「减少动态效果」偏好
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  // 移动端关闭：保持移动端体验干净、省电
  if (window.matchMedia('(max-width: 768px)').matches) return
  enabled = true
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  raf = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  if (!enabled) return
  cancelAnimationFrame(raf)
  window.removeEventListener('pointermove', onPointerMove)
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
/* ===== 背景层：fixed 铺满视口，z-index:0 位于画布之上、内容之下 =====
 * 内容容器（VPContent / VPFooter）在 custom.css 中被抬升到 z-index:1。 */
.glow-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

/* 外层：JS 视差位移（--mx/--my ∈ -1~1，乘以每光斑深度 --depth） */
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

/* 内层：CSS 缓慢漂移 + 径向渐变光斑（边缘自然消散，无需 blur 滤镜） */
.glow-blob__core {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(
    circle at center,
    var(--blob-color, rgba(44, 122, 123, 0.5)) 0%,
    rgba(0, 0, 0, 0) 68%
  );
  will-change: transform, opacity;
}

.glow-blob--a .glow-blob__core {
  animation: glow-drift-a 27s ease-in-out infinite;
}
.glow-blob--b .glow-blob__core {
  animation: glow-drift-b 34s ease-in-out infinite;
}
.glow-blob--c .glow-blob__core {
  animation: glow-drift-c 30s ease-in-out infinite;
}

@keyframes glow-drift-a {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(52px, 36px, 0) scale(1.1);
  }
}
@keyframes glow-drift-b {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1.05);
  }
  50% {
    transform: translate3d(-60px, -28px, 0) scale(0.94);
  }
}
@keyframes glow-drift-c {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(0.98);
  }
  50% {
    transform: translate3d(34px, -46px, 0) scale(1.08);
  }
}

/* 暗色模式：光斑整体压暗，避免在深底上过曝 */
.dark .glow-layer {
  opacity: 0.45;
}

/* 移动端：整体隐藏（JS 也不会绑定监听，双保险） */
@media (max-width: 768px) {
  .glow-layer {
    display: none;
  }
}
</style>
