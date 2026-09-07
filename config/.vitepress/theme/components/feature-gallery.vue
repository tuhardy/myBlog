<script setup lang="ts">
/**
 * feature-gallery.vue — 杂志编辑风「内容导览」区块（全站编号 02）
 *
 * 卡片语言从玻璃拟态转为杂志纸感：
 *  - 纯白卡 + 1px 细边 + 小圆角（12px），右上超大半透明编号 01/02/03；
 *  - 底部 mono 字体的「ENTER /frontend/ →」页脚，带顶部分隔线；
 *  - hover：描边转品牌墨蓝、卡片呼吸式上下浮动（保留已验收的呼吸动效）、
 *    编号水印加深、页脚泛起淡底色；
 *  - 整卡 <a> 可点击跳转对应栏目。
 */
import { withBase } from 'vitepress'

interface GalleryFeature {
  icon: string
  title: string
  tagline: string
  link: string
}

const features: GalleryFeature[] = [
  {
    icon: '🎨',
    title: '前端笔记',
    tagline: 'Vue 3 组合式 API、工程化实践与 CSS 心得。',
    link: '/frontend/',
  },
  {
    icon: '🧩',
    title: '后端 · 中间件',
    tagline: 'Node.js、RESTful、鉴权会话与 Nginx / 消息队列。',
    link: '/backend/',
  },
  {
    icon: '🗄️',
    title: '数据库 · 架构',
    tagline: 'MySQL、Redis 缓存三大难题与设计模式沉淀。',
    link: '/database/',
  },
]
</script>

<template>
  <section id="gallery" class="feature-gallery">
    <p class="mag-mono feature-gallery__kicker">02 — EXPLORE</p>
    <h2 class="feature-gallery__heading">
      内容导览
      <span class="feature-gallery__rule" aria-hidden="true" />
    </h2>

    <div class="feature-gallery__grid">
      <a
        v-for="(f, i) in features"
        :key="f.title"
        class="mag-card"
        :href="withBase(f.link)"
      >
        <span class="mag-card__no" aria-hidden="true">0{{ i + 1 }}</span>
        <span class="mag-card__icon" aria-hidden="true">{{ f.icon }}</span>
        <h3 class="mag-card__title">{{ f.title }}</h3>
        <p class="mag-card__details">{{ f.tagline }}</p>
        <span class="mag-mono mag-card__foot">
          ENTER&nbsp;{{ f.link }}&nbsp;→
        </span>
      </a>
    </div>
  </section>
</template>

<style scoped>
.feature-gallery {
  margin: 0 auto;
  padding: 16px 0 88px;
  scroll-margin-top: 80px;
}

.feature-gallery__kicker {
  margin: 0 0 14px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.28em;
  color: var(--vp-c-brand-1);
}

/* 标题 + 右侧延展 hairline（重置 .vp-doc h2 默认的 border-top 分隔线） */
.feature-gallery__heading {
  display: flex;
  align-items: center;
  gap: 24px;
  margin: 0 0 40px;
  padding: 0;
  border: 0;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: var(--vp-c-text-1);
}
.feature-gallery__rule {
  flex: 1;
  height: 1px;
  background: var(--vp-c-divider);
}

.feature-gallery__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
}

/* ===== 杂志纸感卡片 ===== */
.mag-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 32px 28px 0;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.09);
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  transition: border-color 0.35s ease, box-shadow 0.35s ease;
  will-change: transform;
}
.mag-card:hover {
  animation: mag-card-breathe 2.8s ease-in-out infinite;
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 18px 44px rgba(44, 62, 80, 0.14);
}
@keyframes mag-card-breathe {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

/* 超大编号水印 */
.mag-card__no {
  position: absolute;
  top: 10px;
  right: 20px;
  font-size: 64px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-brand-1);
  opacity: 0.07;
  transition: opacity 0.35s ease;
}
.mag-card:hover .mag-card__no {
  opacity: 0.2;
}

.mag-card__icon {
  display: block;
  font-size: 30px;
  line-height: 1;
  margin-bottom: 18px;
}
.mag-card__title {
  margin: 0 0 10px;
  font-size: 19px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  transition: color 0.25s ease;
}
.mag-card:hover .mag-card__title {
  color: var(--vp-c-brand-1);
}
.mag-card__details {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: var(--vp-c-text-2);
}

/* 底部 mono 页脚：负 margin 撑满卡片宽度，顶部分隔线 */
.mag-card__foot {
  margin: auto -28px 0;
  padding: 14px 28px;
  border-top: 1px solid rgba(15, 23, 42, 0.07);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--vp-c-brand-1);
  transition: background-color 0.3s ease;
}
.mag-card:hover .mag-card__foot {
  background: rgba(44, 62, 80, 0.04);
}

/* ===== 暗色模式：深纸卡（绝不用纯黑） ===== */
.dark .mag-card {
  background: rgba(38, 40, 46, 0.7);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border-color: rgba(255, 255, 255, 0.08);
}
.dark .mag-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.4);
}
.dark .mag-card__foot {
  border-top-color: rgba(255, 255, 255, 0.08);
}
.dark .mag-card:hover .mag-card__foot {
  background: rgba(143, 168, 200, 0.08);
}
</style>
