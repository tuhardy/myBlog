<script setup lang="ts">
/**
 * magazine-hero.vue — 杂志编辑风首页 Banner（首页区块 01）
 *
 * 在 docs/index.md 中直接引入并渲染（首页组合由 Markdown 编排）。
 * 设计语言：
 *  - 刊头（masthead）：mono 小字 + 上下 hairline，像期刊的版权页；
 *  - 不对称两栏：左侧超大标题（实心 + 描边空心混排，杂志签名手法）、
 *    右侧方形裁切肖像 + 偏移线框装饰 + FIG.01 图注；
 *  - 数据条：文章数 / 栏目数 / 最近更新，hairline 竖分隔；
 *  - 全站编号体系：本区块为 01，画廊 02，文章 03。
 * 数据通过 props 传入（由 docs/index.md 引入 stats.data 构建期数据），
 * 避免主题目录（srcDir 外）无法消费 data loader 的 SSR 限制。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'

interface SiteStats {
  total: number
  categories: number
  latestLabel: string
}
const props = defineProps<{ stats: SiteStats }>()

const avatarSrc = withBase('/avatar.jpg')
const pad2 = (n: number) => String(n).padStart(2, '0')
const total = computed(() => pad2(props.stats?.total ?? 0))
const categories = computed(() => pad2(props.stats?.categories ?? 0))
const latest = computed(() => props.stats?.latestLabel ?? '—')

// ===== 数字滚动：SSR 直接渲染真实值，挂载后从 00 count-up =====
const displayTotal = ref(total.value)
const displayCategories = ref(categories.value)

const COUNTUP_DELAY = 520 // 与数据条入场动画（约 430ms 延迟）对齐
const COUNTUP_DURATION = 900
let countRaf = 0
let countTid = 0

// ===== 拍立得 3D 视差：JS 写 --p-rx/--p-ry，CSS transition 自带惯性感 =====
const figureRef = ref<HTMLElement | null>(null)
const polaroidRef = ref<HTMLElement | null>(null)
const TILT_X = 6 // 最大俯仰角（度）
const TILT_Y = 7 // 最大偏转角（度）

function onFigureMove(e: PointerEvent) {
  const fig = figureRef.value
  const card = polaroidRef.value
  if (!fig || !card) return
  const rect = fig.getBoundingClientRect()
  const px = (e.clientX - rect.left) / rect.width - 0.5
  const py = (e.clientY - rect.top) / rect.height - 0.5
  card.style.setProperty('--p-ry', `${(px * TILT_Y).toFixed(2)}deg`)
  card.style.setProperty('--p-rx', `${(-py * TILT_X).toFixed(2)}deg`)
}
function onFigureLeave() {
  polaroidRef.value?.style.setProperty('--p-rx', '0deg')
  polaroidRef.value?.style.setProperty('--p-ry', '0deg')
}

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return

  // count-up：延迟到数据条入场后开始，结束时保证落在真实值
  countTid = window.setTimeout(() => {
    const targetTotal = props.stats?.total ?? 0
    const targetCats = props.stats?.categories ?? 0
    const t0 = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / COUNTUP_DURATION)
      const e = 1 - Math.pow(1 - p, 3)
      displayTotal.value = pad2(Math.round(targetTotal * e))
      displayCategories.value = pad2(Math.round(targetCats * e))
      if (p < 1) countRaf = requestAnimationFrame(step)
    }
    displayTotal.value = '00'
    displayCategories.value = '00'
    countRaf = requestAnimationFrame(step)
  }, COUNTUP_DELAY)

  // 视差倾斜仅对精确指针（鼠标）启用，触屏跳过
  if (window.matchMedia('(pointer: fine)').matches) {
    figureRef.value?.addEventListener('pointermove', onFigureMove, { passive: true })
    figureRef.value?.addEventListener('pointerleave', onFigureLeave)
  }
})

onBeforeUnmount(() => {
  window.clearTimeout(countTid)
  cancelAnimationFrame(countRaf)
  figureRef.value?.removeEventListener('pointermove', onFigureMove)
  figureRef.value?.removeEventListener('pointerleave', onFigureLeave)
})
</script>

<template>
  <section class="mag-hero">
    <!-- 刊头：期刊式 mono 信息行 -->
    <header class="mag-hero__masthead">
      <span class="mag-mono">ISSUE&nbsp;NO.01</span>
      <span class="mag-mono mag-hero__mastline">TECH&nbsp;NOTES · 技术札记</span>
      <span class="mag-mono">SINCE&nbsp;2026</span>
      <span class="mag-sign mag-hand" aria-hidden="true">tuhardy</span>
    </header>

    <div class="mag-hero__body">
      <!-- 左栏：标题 + 简介 + 动作 + 数据 -->
      <div class="mag-hero__main">
        <p class="mag-mono mag-hero__kicker">DEVELOPER'S&nbsp;JOURNAL — 开发者手记</p>
        <h1 class="mag-hero__title">
          以<em class="mag-mark">代码</em>为舟
          <span class="mag-hero__title-stroke">以文字为桨</span>
          <span class="mag-note" aria-hidden="true">
            <span class="mag-hand">敲代码，也写字</span>
            <svg class="mag-note__arrow" viewBox="0 0 100 42" fill="none">
              <path
                d="M88 8 C 66 30, 38 36, 16 28"
                stroke="var(--vp-c-accent)"
                stroke-width="2"
                stroke-linecap="round"
              />
              <path
                d="M16 28 l 13 -4 M16 28 l 5 -12"
                stroke="var(--vp-c-accent)"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </span>
        </h1>
        <p class="mag-hero__desc">
          记录前端、后端、中间件与数据库的踩坑实录，也收留一些关于生活的胡思乱想。
        </p>
        <div class="mag-hero__actions">
          <a class="mag-btn mag-btn--solid" href="#latest">开始阅读</a>
          <a class="mag-btn mag-btn--ghost" href="#gallery">栏目导览</a>
        </div>

        <dl class="mag-stats">
          <div class="mag-stats__item">
            <dt class="mag-mono">文章 / POSTS</dt>
            <dd>{{ displayTotal }}<small>&nbsp;篇</small></dd>
          </div>
          <div class="mag-stats__item">
            <dt class="mag-mono">栏目 / SECTIONS</dt>
            <dd>{{ displayCategories }}<small>&nbsp;个</small></dd>
          </div>
          <div class="mag-stats__item">
            <dt class="mag-mono">最近更新 / LATEST</dt>
            <dd class="mag-stats__date">{{ latest }}</dd>
          </div>
        </dl>
      </div>

      <!-- 右栏：拍立得相片风肖像 -->
      <figure ref="figureRef" class="mag-hero__figure">
        <div ref="polaroidRef" class="mag-hero__polaroid">
          <div class="mag-hero__portrait">
            <img :src="avatarSrc" alt="博主与他的狗" />
          </div>
          <div class="mag-hero__caption">
            <span class="mag-hero__caption-main">博主与他的狗</span>
            <span class="mag-hero__caption-sub mag-mono">FIG.01 · 2026</span>
          </div>
        </div>
      </figure>
    </div>
  </section>
</template>

<style scoped>
.mag-hero {
  margin: 0 auto;
  padding: 40px 0 48px;
}

/* ===== 入场动画：各元素错峰 fade-up =====
 * 用独立的 translate 属性而非 transform，避免与拍立得的 hover/视差 transform 冲突；
 * backwards 填充只在延迟期间套用 from 态，动画结束即归还元素自身样式。
 */
@keyframes hero-in {
  from {
    opacity: 0;
    translate: 0 20px;
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
}
@media (prefers-reduced-motion: no-preference) {
  .mag-hero__masthead,
  .mag-hero__kicker,
  .mag-hero__title,
  .mag-hero__desc,
  .mag-hero__actions,
  .mag-stats,
  .mag-hero__figure,
  .mag-note {
    animation: hero-in 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
  }
  .mag-hero__kicker { animation-delay: 90ms; }
  .mag-hero__title { animation-delay: 170ms; }
  .mag-hero__desc { animation-delay: 250ms; }
  .mag-hero__actions { animation-delay: 330ms; }
  .mag-stats { animation-delay: 430ms; }
  .mag-hero__figure { animation-delay: 240ms; }
  .mag-note { animation-delay: 620ms; }
}

/* ===== 刊头：上下 hairline 包夹的 mono 信息行 ===== */
.mag-hero__masthead {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
}
.mag-hero__mastline {
  flex: 1;
  text-align: center;
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
/* 刊头手写签名：印记色，微倾斜 */
.mag-sign {
  color: var(--vp-c-accent);
  font-size: 17px;
  line-height: 1;
  transform: rotate(-3deg);
}

/* ===== 不对称两栏：7 : 5 ===== */
.mag-hero__body {
  display: grid;
  grid-template-columns: 7fr 5fr;
  gap: 72px;
  align-items: center;
  padding: 72px 0 56px;
}

.mag-hero__kicker {
  margin: 0 0 20px;
  color: var(--vp-c-accent);
  font-weight: 600;
}

/* 超大标题：clamp 响应式，第二行描边空心字 */
.mag-hero__title {
  position: relative;
  margin: 0 0 24px;
  font-size: clamp(44px, 6vw, 76px);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.01em;
  color: var(--vp-c-text-1);
}
.mag-hero__title-stroke {
  display: block;
  color: transparent;
  -webkit-text-stroke: 1.5px var(--vp-c-accent);
  transition: color 0.35s ease;
}
/* 悬停大标题时，描边空心字填回印记色 */
.mag-hero__title:hover .mag-hero__title-stroke {
  color: var(--vp-c-accent);
}
/* 荧光笔高亮：不规则圆角 + 两端渐隐的 accent 底，模拟马克笔扫过 */
.mag-mark {
  font-style: normal;
  padding: 0 0.1em;
  background: linear-gradient(
    100deg,
    transparent 0%,
    var(--vp-c-accent-soft) 3%,
    var(--vp-c-accent-soft) 97%,
    transparent 100%
  );
  border-radius: 0.15em 0.5em 0.2em 0.55em;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}
/* 手写批注：标题右上空白处的 cursive 小字 + 手绘箭头 */
.mag-note {
  position: absolute;
  right: -8px;
  top: 4%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0;
  transform: rotate(-4deg);
  color: var(--vp-c-accent);
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0;
  pointer-events: none;
}
.mag-note__arrow {
  width: 92px;
  height: auto;
  margin-right: 6px;
}

.mag-hero__desc {
  margin: 0 0 36px;
  max-width: 32em;
  font-size: 17px;
  line-height: 1.9;
  color: var(--vp-c-text-2);
}

/* ===== 按钮组：实心墨蓝 + 文字下划线款 ===== */
.mag-hero__actions {
  display: flex;
  align-items: center;
  gap: 28px;
  margin-bottom: 48px;
}
.mag-btn {
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.25s ease, color 0.25s ease;
}
.mag-btn--solid {
  padding: 13px 34px;
  border-radius: 4px;
  background: var(--vp-c-brand-1);
  color: #fff;
  letter-spacing: 0.04em;
}
.mag-btn--solid:hover {
  background: var(--vp-c-brand-3);
  transform: translateY(-2px);
}
.mag-btn--ghost {
  padding: 13px 2px;
  color: var(--vp-c-text-1);
  border-bottom: 2px solid var(--vp-c-accent);
}
.mag-btn--ghost:hover {
  color: var(--vp-c-accent);
}

/* ===== 数据条：hairline 竖分隔 ===== */
.mag-stats {
  display: flex;
  margin: 0;
  padding: 28px 0 0;
  border-top: 1px solid var(--vp-c-divider);
}
.mag-stats__item {
  flex: 1;
  margin: 0;
  padding-right: 24px;
}
.mag-stats__item + .mag-stats__item {
  padding-left: 24px;
  border-left: 1px solid var(--vp-c-divider);
}
.mag-stats dt {
  margin: 0 0 10px;
  font-size: 11px;
  color: var(--vp-c-text-3);
}
.mag-stats dd {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  line-height: 1;
  color: var(--vp-c-brand-1);
  font-variant-numeric: tabular-nums;
}
.mag-stats dd small {
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-3);
}
.mag-stats__date {
  font-size: 22px !important;
  padding-top: 6px;
}

/* ===== 右栏肖像：拍立得相片风 =====
 * 结构：figure > polaroid(白卡: 内边距 + 轻微旋转 + 投影)
 *                > portrait(图片区: 1:1 裁切, 圆角)
 *                > caption(底部手写体标题 + mono 编号)
 * 白色相纸用真实背景色，避免暗色模式下"白边"刺眼；
 * 投影用极柔和的多层阴影，hover 时相片回正 + 微抬。
 */
.mag-hero__figure {
  position: relative;
  margin: 0;
  width: 100%;
  /* 缩小肖像占比：5fr 栏内右对齐限宽，留白交给版面 */
  max-width: 280px;
  justify-self: end;
  perspective: 1200px;
}
/* 编辑部装裱：偏移线框衬在相片后面 */
.mag-hero__figure::before {
  content: "";
  position: absolute;
  inset: -14px 14px 14px -14px;
  border: 1px solid var(--vp-c-accent);
  opacity: 0.3;
  pointer-events: none;
  transition: opacity 0.4s ease;
}
.mag-hero__figure:hover::before {
  opacity: 0.55;
}
.mag-hero__polaroid {
  position: relative;
  background: var(--vp-c-bg-soft);
  padding: 14px 14px 56px;
  border-radius: 6px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.06),
    0 12px 32px rgba(44, 62, 80, 0.12);
  /* 倾斜/旋转/抬升拆为 CSS 变量：JS 视差写 --p-rx/--p-ry，hover 写 --p-rot/--p-lift，
     0.5s 过渡兼作视差的惯性平滑 */
  transform:
    rotate(var(--p-rot, -2deg))
    rotateX(var(--p-rx, 0deg))
    rotateY(var(--p-ry, 0deg))
    translateY(var(--p-lift, 0px));
  transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.5s ease;
}
.mag-hero__polaroid:hover {
  --p-rot: 0deg;
  --p-lift: -4px;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.08),
    0 20px 48px rgba(44, 62, 80, 0.18);
}
/* 顶部半透明「胶带」：把拍立得「贴」在页面上 */
.mag-hero__polaroid::after {
  content: "";
  position: absolute;
  top: -13px;
  left: 50%;
  width: 118px;
  height: 30px;
  transform: translateX(-50%) rotate(-2.5deg);
  background: rgba(165, 180, 200, 0.34);
  border-left: 1px dashed rgba(255, 255, 255, 0.5);
  border-right: 1px dashed rgba(255, 255, 255, 0.5);
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
  pointer-events: none;
}
.dark .mag-hero__polaroid::after {
  background: rgba(143, 168, 200, 0.2);
  border-color: rgba(255, 255, 255, 0.18);
}
.mag-hero__portrait {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 3px;
  overflow: hidden;
  background: var(--vp-c-bg-mute, #ddd);
}
.mag-hero__portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
  transition: transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.mag-hero__polaroid:hover .mag-hero__portrait img {
  transform: scale(1.04);
}
/* 底部手写体签名：用 cursive 字体栈，模拟拍立得相纸底部的笔迹 */
.mag-hero__caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.mag-hero__caption-main {
  font-family: 'Segoe Script', 'Brush Script MT', 'Comic Sans MS', cursive;
  font-size: 18px;
  line-height: 1.1;
  color: var(--vp-c-accent);
  transform: rotate(-1.5deg);
}
.mag-hero__caption-sub {
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--vp-c-text-3);
  opacity: 0.7;
}

/* ===== 响应式：<960px 单栏，肖像置底缩小 ===== */
@media (max-width: 960px) {
  .mag-hero__body {
    grid-template-columns: 1fr;
    gap: 48px;
    padding: 48px 0 40px;
  }
  .mag-hero__figure {
    max-width: 240px;
    justify-self: center;
    margin: 0 auto;
  }
  .mag-hero__actions {
    margin-bottom: 40px;
  }
  /* 窄屏单栏后标题右侧没有批注的落位空间 */
  .mag-note {
    display: none;
  }
}
@media (max-width: 640px) {
  .mag-hero__mastline {
    display: none;
  }
  .mag-hero__masthead {
    justify-content: space-between;
  }
  .mag-stats dd {
    font-size: 24px;
  }
  .mag-stats__date {
    font-size: 17px !important;
  }
}
</style>
