---
# 首页：杂志风 Banner + 内容导览 + 最新文章，全部在 Markdown 中编排
# （data loader 仅在 srcDir 内的 Markdown 编译链上可用，故组件在此引入）
layout: home
---

<script setup>
import { onMounted, ref } from 'vue'
import { data as latestPosts } from '../config/.vitepress/posts.data.ts'
import { data as stats } from './stats.data'
import MagazineHero from '../config/.vitepress/theme/components/magazine-hero.vue'
import FeatureGallery from '../config/.vitepress/theme/components/feature-gallery.vue'

const BASE = import.meta.env.BASE_URL || '/'
const toHref = (path) => BASE + String(path || '').replace(/^\//, '')

// 最新文章列表样式：toc（目录式）/ cards（卡片式），localStorage 持久化
const LIST_STYLE_KEY = 'pref-post-list'
const listStyle = ref('toc')
onMounted(() => {
  try {
    const saved = localStorage.getItem(LIST_STYLE_KEY)
    if (saved === 'cards' || saved === 'toc') listStyle.value = saved
  } catch {}
})
function setListStyle(v) {
  listStyle.value = v
  try { localStorage.setItem(LIST_STYLE_KEY, v) } catch {}
}
</script>

<!-- 01 杂志风 Banner：刊头 + 不对称大标题 + 数据条 + 方形肖像 -->
<MagazineHero :stats="stats" />

<!-- 02 内容导览：三张杂志编号卡片 -->
<FeatureGallery />

<!-- 03 最新文章 -->
<div id="latest" class="post-list-wrap" :class="{ 'is-cards': listStyle === 'cards' }">

<div class="post-list__head">
  <h2 class="post-list__heading"><span class="mag-mono post-list__num">03 — LATEST POSTS</span><span class="home-section-title">最新文章</span></h2>
  <div class="view-switch" role="group" aria-label="文章列表样式">
    <button
      type="button"
      :class="{ 'is-on': listStyle === 'toc' }"
      :aria-pressed="listStyle === 'toc'"
      @click="setListStyle('toc')"
    >目录</button>
    <button
      type="button"
      :class="{ 'is-on': listStyle === 'cards' }"
      :aria-pressed="listStyle === 'cards'"
      @click="setListStyle('cards')"
    >卡片</button>
  </div>
</div>

<ul class="post-list">
  <li v-for="(p, i) in latestPosts" :key="p.link" v-reveal="i">
    <a class="post-row" :href="toHref(p.link)">
      <span class="post-no" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
      <span class="post-main">
        <span class="post-line">
          <span class="post-title">{{ p.title || '（未命名）' }}</span>
          <span class="post-dots" aria-hidden="true"></span>
          <span class="post-aside">
            <span class="post-tag">#{{ p.category }}</span>
            <span class="post-date">{{ p.date }}</span>
          </span>
        </span>
        <span class="post-excerpt" v-if="p.excerpt">{{ p.excerpt }}</span>
      </span>
      <span class="post-arrow" aria-hidden="true">→</span>
    </a>
  </li>
  <li v-if="!latestPosts || latestPosts.length === 0" v-reveal>
    <a class="post-row" :href="toHref('/notes/')">
      <span class="post-no" aria-hidden="true">01</span>
      <span class="post-main">
        <span class="post-line">
          <span class="post-title">还没有文章，去笔记合集看看</span>
          <span class="post-dots" aria-hidden="true"></span>
          <span class="post-aside"><span class="post-tag">#随笔</span></span>
        </span>
        <span class="post-excerpt">给 docs 目录下的 md 补上正文内容，构建期会自动按 git 提交时间收录最新三篇。</span>
      </span>
      <span class="post-arrow" aria-hidden="true">→</span>
    </a>
  </li>
</ul>

</div>
