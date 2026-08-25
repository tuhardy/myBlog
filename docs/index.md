---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "我的博客"
  text: "千里之行，始于足下"
  tagline: 一个记录技术、思考与生活的小站。
  image:
    src: /avatar.jpg
    alt: 我的头像
  # actions（浏览文章 / 关于我 两个按钮）已按要求移除
  # actions:
  #   - theme: brand
  #     text: 浏览文章
  #     link: /markdown-examples
  #   - theme: alt
  #     text: 关于我
  #     link: /api-examples

features:
  # 前 4 张：真实外链
  - icon: 🍔
    title: 美团技术团队
    details: 一线大厂分布式 / 工程化 / 数据基建文章天花板
    link: https://tech.meituan.com/
  - icon: 🤖
    title: 鱼皮 AI 导航
    details: 编程 + AI 工具一站式导航
    link: https://ai.codefather.cn/
  - icon: 🟩
    title: Vue 3 交互式教程
    details: Step 1 起步，组合式 API / script setup
    link: https://cn.vuejs.org/tutorial/#step-1
  - icon: 🌱
    title: Spring Boot 官方文档
    details: Java 后端一站式配置参考
    link: https://docs.spring.io/spring-boot/index.html
  # 后 4 张：✨ 占位，后续补齐真实外链即可
  - icon: ✨
    title: 待补充 #5
    details: 占位卡片，替换 icon / title / details / link 四行即可
    link: '#'
  - icon: ✨
    title: 待补充 #6
    details: 占位卡片，替换 icon / title / details / link 四行即可
    link: '#'
  - icon: ✨
    title: 待补充 #7
    details: 占位卡片，替换 icon / title / details / link 四行即可
    link: '#'
  - icon: ✨
    title: 待补充 #8
    details: 占位卡片，替换 icon / title / details / link 四行即可
    link: '#'
---

<script setup>
import { data as latestPosts } from '../config/.vitepress/posts.data.ts'
const BASE = import.meta.env.BASE_URL || '/'
const toHref = (path) => BASE + String(path || '').replace(/^\//, '')
</script>

<div class="post-list-wrap">

## <span class="home-section-title">最新文章</span>

<ul class="post-list">
  <li v-for="p in latestPosts" :key="p.link">
    <div class="main-row">
      <span class="date">{{ p.date }}</span>
      <a :href="toHref(p.link)">{{ p.title || '（未命名）' }}</a>
      <span class="desc" v-if="p.desc">{{ p.desc }}</span>
      <span class="desc" v-else>点击阅读 →</span>
    </div>
    <div class="excerpt" v-if="p.excerpt" v-html="p.excerpt"></div>
    <a class="read-more" :href="toHref(p.link)">继续阅读 →</a>
  </li>
  <li v-if="!latestPosts || latestPosts.length === 0">
    <div class="main-row">
      <span class="date">——</span>
      <a :href="toHref('/notes/')">还没有文章，去笔记合集看看 →</a>
      <span class="desc">请给 docs 目录下的 md 补上 Frontmatter date 字段</span>
    </div>
  </li>
</ul>

</div>
