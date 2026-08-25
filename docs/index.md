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
  # 两个 CTA 按钮已移除（用户要求），若以后想加回来：
  # actions:
  #   - theme: brand
  #     text: 浏览文章
  #     link: /notes/
  #   - theme: alt
  #     text: 关于我
  #     link: /about/

features:
  # ========= 真实 4 张 =========
  - icon: 🍔
    title: 美团技术团队
    details: 一线大厂技术博客，海量高质量分布式 / 工程化 / 数据基建文章，深度天花板
    link: https://tech.meituan.com/

  - icon: 🤖
    title: 鱼皮 AI 导航
    details: 编程学习资源 & AI 工具一站式导航，对新手极度友好，找工具不再迷路
    link: https://ai.codefather.cn/

  - icon: �
    title: Vue 3 交互式教程
    details: 官方教程 Step 1 起步，边写边学，组合式 API + `<script setup>` 快速上手
    link: https://cn.vuejs.org/tutorial/#step-1

  - icon: 🌱
    title: Spring Boot 官方文档
    details: Java 后端开发必备参考，入门到生产所有机制 & 配置 & 最佳实践一站式查
    link: https://docs.spring.io/spring-boot/index.html

  # ========= 下方 4 张为用户日后补充占位（改 icon/title/details/link 四行即可）=========
  - icon: ✨
    title: 待补充 #5
    details: 占位卡片 —— 把这 4 行改成你想放的任何技术站、社区、个人项目、文档站
    link: '#'

  - icon: ✨
    title: 待补充 #6
    details: 占位卡片 —— 把这 4 行改成你想放的任何技术站、社区、个人项目、文档站
    link: '#'

  - icon: ✨
    title: 待补充 #7
    details: 占位卡片 —— 把这 4 行改成你想放的任何技术站、社区、个人项目、文档站
    link: '#'

  - icon: ✨
    title: 待补充 #8
    details: 占位卡片 —— 把这 4 行改成你想放的任何技术站、社区、个人项目、文档站
    link: '#'
---

<script setup>
// 从 createContentLoader 取构建期生成的最新 3 篇文章数据
// 相对路径：index.md 在 docs/，.. 就是 report-web/，再进 config/.vitepress
import { data as latestPosts } from '../config/.vitepress/posts.data.ts'

// createContentLoader 返回的 url 是「VitePress 内部路由」，形如 /frontend/getting-started
// （无 base 前缀、无 .html 扩展名）。要在普通 <a href> 里跳转，
// 必须拼上 Vite 注入的 import.meta.env.BASE_URL（此处是 /myBlog/），
// 否则从 /myBlog/ 点击会直接请求根路径 /frontend/getting-started.html → 404
const BASE = import.meta.env.BASE_URL || '/'
const toHref = (path) => BASE + String(path || '').replace(/^\//, '')
</script>

<div class="post-list-wrap">

## <span class="home-section-title">最新文章</span>

<ul class="post-list">
  <li v-for="p in latestPosts" :key="p.link">
    <span class="date">{{ p.date }}</span>
    <a :href="toHref(p.link)">{{ p.title || '（未命名）' }}</a>
    <span class="desc" v-if="p.desc">{{ p.desc }}</span>
    <span class="desc" v-else>点击阅读 →</span>
  </li>
  <li v-if="!latestPosts || latestPosts.length === 0">
    <span class="date">——</span>
    <a :href="toHref('/notes/')">还没有文章，去笔记合集看看 →</a>
    <span class="desc">请给 docs 目录下的 md 补上 Frontmatter date 字段</span>
  </li>
</ul>

</div>
