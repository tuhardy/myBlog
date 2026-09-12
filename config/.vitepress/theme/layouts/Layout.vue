<script setup lang="ts">
/**
 * Layout.vue — VitePress 默认主题增强布局
 *
 * 原则：完全保留默认主题的导航栏 / 侧边栏 / 大纲 / 文档页结构，
 * 只通过官方插槽（slots）做「最小侵入」注入：
 *
 *   #layout-top  → 呼吸阅读进度条 + 光标粒子背景层（均为 fixed 定位，全站）
 *   #doc-bottom  → 文档页末尾的情境 emoji 装饰
 *
 * 首页的杂志风 Banner 与内容导览画廊在 docs/index.md 中直接编排
 * （Markdown 内可正常使用 data loader 获取构建期数据）。
 *
 * 趣味交互组件包在 <ClientOnly> 中，SSR 阶段不输出、不报错；
 * 组件内部已对移动端（≤768px）与 prefers-reduced-motion 做降级。
 */
import DefaultTheme from 'vitepress/theme'
import GlowParticle from '../components/glow-particle.vue'
import ProgressBreath from '../components/progress-breath.vue'
import ContextEmoji from '../components/context-emoji.vue'
import BackTop from '../components/back-top.vue'
import FontSwitch from '../components/font-switch.vue'
import SearchHitBadge from '../components/search-hit-badge.vue'

const { Layout: DefaultLayout } = DefaultTheme
</script>

<template>
  <DefaultLayout>
    <!-- 全局层：fixed 定位元素，插槽物理位置不影响视觉 -->
    <template #layout-top>
      <ClientOnly>
        <ProgressBreath />
        <GlowParticle />
        <BackTop />
        <SearchHitBadge />
      </ClientOnly>
    </template>

    <!-- 导航栏：展示字体切换（文楷 ⇄ 无衬线）；nav-screen 覆盖移动端抽屉菜单 -->
    <template #nav-bar-content-after>
      <ClientOnly>
        <FontSwitch />
      </ClientOnly>
    </template>
    <template #nav-screen-content-after>
      <ClientOnly>
        <FontSwitch />
      </ClientOnly>
    </template>

    <!-- 文档页：文末情境 emoji -->
    <template #doc-bottom>
      <ClientOnly>
        <ContextEmoji />
      </ClientOnly>
    </template>
  </DefaultLayout>
</template>
