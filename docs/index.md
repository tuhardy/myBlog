---
# 首页：杂志风 Banner + 内容导览 + 最新文章，全部在 Markdown 中编排
# （data loader 仅在 srcDir 内的 Markdown 编译链上可用，故组件在此引入）
layout: home
---

<script setup>
import { data as latestPosts } from '../config/.vitepress/posts.data.ts'
import { data as stats } from './stats.data'
import MagazineHero from '../config/.vitepress/theme/components/magazine-hero.vue'
import FeatureGallery from '../config/.vitepress/theme/components/feature-gallery.vue'

const BASE = import.meta.env.BASE_URL || '/'
const toHref = (path) => BASE + String(path || '').replace(/^\//, '')
</script>

<!-- 01 杂志风 Banner：刊头 + 不对称大标题 + 数据条 + 方形肖像 -->
<MagazineHero :stats="stats" />

<!-- 02 内容导览：三张杂志编号卡片 -->
<FeatureGallery />

<!-- 03 最新文章 -->
<div id="latest" class="post-list-wrap">

## <span class="mag-mono post-list__num">03 — LATEST POSTS</span><span class="home-section-title">最新文章</span>

<ul class="post-list">
  <li v-for="(p, i) in latestPosts" :key="p.link">
    <span class="post-no" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
    <div class="post-meta">
      <span class="post-tag">#{{ p.category }}</span>
      <span class="post-date">{{ p.date }}</span>
    </div>
    <a class="post-title" :href="toHref(p.link)">{{ p.title || '（未命名）' }}</a>
    <p class="post-excerpt" v-if="p.excerpt">{{ p.excerpt }}</p>
    <div class="post-foot">
      <a class="read-more" :href="toHref(p.link)">继续阅读 →</a>
    </div>
  </li>
  <li v-if="!latestPosts || latestPosts.length === 0">
    <span class="post-no" aria-hidden="true">01</span>
    <div class="post-meta">
      <span class="post-tag">#随笔</span>
    </div>
    <a class="post-title" :href="toHref('/notes/')">还没有文章，去笔记合集看看 →</a>
    <p class="post-excerpt">请给 docs 目录下的 md 补上正文内容，构建期会自动按 git 提交时间收录最新三篇。</p>
  </li>
</ul>

</div>
