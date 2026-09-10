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
import { computed } from 'vue'
import { withBase } from 'vitepress'

interface SiteStats {
  total: number
  categories: number
  latestLabel: string
}
const props = defineProps<{ stats: SiteStats }>()

const avatarSrc = withBase('/avatar.jpg')
const total = computed(() => String(props.stats?.total ?? 0).padStart(2, '0'))
const categories = computed(() => String(props.stats?.categories ?? 0).padStart(2, '0'))
const latest = computed(() => props.stats?.latestLabel ?? '—')
</script>

<template>
  <section class="mag-hero">
    <!-- 刊头：期刊式 mono 信息行 -->
    <header class="mag-hero__masthead">
      <span class="mag-mono">ISSUE&nbsp;NO.01</span>
      <span class="mag-mono mag-hero__mastline">TECH&nbsp;NOTES · 技术札记</span>
      <span class="mag-mono">SINCE&nbsp;2026</span>
    </header>

    <div class="mag-hero__body">
      <!-- 左栏：标题 + 简介 + 动作 + 数据 -->
      <div class="mag-hero__main">
        <p class="mag-mono mag-hero__kicker">DEVELOPER'S&nbsp;JOURNAL — 开发者手记</p>
        <h1 class="mag-hero__title">
          以代码为舟
          <span class="mag-hero__title-stroke">以文字为桨</span>
        </h1>
        <p class="mag-hero__desc">
          记录前端、后端、中间件与数据库的踩坑实录，<br />
          也收留一些关于生活的胡思乱想。
        </p>
        <div class="mag-hero__actions">
          <a class="mag-btn mag-btn--solid" href="#latest">开始阅读</a>
          <a class="mag-btn mag-btn--ghost" href="#gallery">栏目导览</a>
        </div>

        <dl class="mag-stats">
          <div class="mag-stats__item">
            <dt class="mag-mono">文章 / POSTS</dt>
            <dd>{{ total }}<small>&nbsp;篇</small></dd>
          </div>
          <div class="mag-stats__item">
            <dt class="mag-mono">栏目 / SECTIONS</dt>
            <dd>{{ categories }}<small>&nbsp;个</small></dd>
          </div>
          <div class="mag-stats__item">
            <dt class="mag-mono">最近更新 / LATEST</dt>
            <dd class="mag-stats__date">{{ latest }}</dd>
          </div>
        </dl>
      </div>

      <!-- 右栏：拍立得相片风肖像 -->
      <figure class="mag-hero__figure">
        <div class="mag-hero__polaroid">
          <div class="mag-hero__portrait">
            <img :src="avatarSrc" alt="博主头像" />
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
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

/* 超大标题：clamp 响应式，第二行描边空心字 */
.mag-hero__title {
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
  -webkit-text-stroke: 1.5px var(--vp-c-brand-1);
}

.mag-hero__desc {
  margin: 0 0 36px;
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
  border-bottom: 2px solid var(--vp-c-brand-1);
}
.mag-btn--ghost:hover {
  color: var(--vp-c-brand-1);
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
  margin: 0;
  perspective: 1200px;
}
.mag-hero__polaroid {
  position: relative;
  background: var(--vp-c-bg-soft);
  padding: 14px 14px 56px;
  border-radius: 6px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.06),
    0 12px 32px rgba(44, 62, 80, 0.12);
  transform: rotate(-2deg);
  transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.5s ease;
}
.mag-hero__polaroid:hover {
  transform: rotate(0deg) translateY(-4px);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.08),
    0 20px 48px rgba(44, 62, 80, 0.18);
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
  color: var(--vp-c-text-2);
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
    max-width: 320px;
    margin: 0 auto;
  }
  .mag-hero__actions {
    margin-bottom: 40px;
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
