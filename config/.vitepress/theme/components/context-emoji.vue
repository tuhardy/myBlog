<script setup lang="ts">
/**
 * context-emoji.vue — 文档末尾的情境 emoji 装饰
 *
 * 根据当前页面的路由路径 + 页面标题关键词，自动匹配一枚应景 emoji：
 *   search/搜索 → 🔍   install/入门 → 🚀   config/配置 → ⚙️
 *   middleware/中间件 → 🛡️   auth/鉴权 → 🔐   database/数据库 → 🗄️ ...
 * 悬停时 emoji 在 3D 透视空间内 rotateY 翻转（perspective + rotateY），
 * 像一枚被指尖轻轻拨动的小徽章。
 *
 * 通过 Layout 的 #doc-bottom 插槽注入，仅文档页出现；移动端隐藏。
 */
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'

interface EmojiRule {
  re: RegExp
  emoji: string
  label: string
}

const RULES: EmojiRule[] = [
  { re: /search|搜索/, emoji: '🔍', label: '搜索' },
  { re: /install|安装|getting-started|入门|快速开始/, emoji: '🚀', label: '启程' },
  { re: /config|配置/, emoji: '⚙️', label: '配置' },
  { re: /middleware|中间件|nginx|队列|\bmq\b/, emoji: '🛡️', label: '中间件' },
  { re: /auth|鉴权|会话|登录|session/, emoji: '🔐', label: '鉴权' },
  { re: /database|数据库|mysql|redis|\bsql\b/, emoji: '🗄️', label: '数据库' },
  { re: /frontend|前端|\bvue\b|\bcss\b|工程化|tooling/, emoji: '🎨', label: '前端' },
  { re: /backend|后端|node\.?js|restful|\bapi\b/, emoji: '🧩', label: '后端' },
  { re: /design|设计模式|架构|singleton|factory|observer/, emoji: '🏛️', label: '设计模式' },
  { re: /note|笔记|markdown|教程/, emoji: '📓', label: '笔记' },
  { re: /deploy|部署|docker/, emoji: '📦', label: '部署' },
]

const route = useRoute()
const { page } = useData()

const current = computed<EmojiRule>(() => {
  const haystack = `${route.path} ${page.value.title ?? ''}`.toLowerCase()
  return RULES.find((r) => r.re.test(haystack)) ?? { re: /./, emoji: '✨', label: '随笔' }
})
</script>

<template>
  <div class="context-emoji" aria-hidden="true">
    <div class="context-emoji__stage">
      <span class="context-emoji__icon">{{ current.emoji }}</span>
    </div>
    <p class="context-emoji__tip">本篇属于「{{ current.label }}」 · 感谢阅读到这里 🌿</p>
  </div>
</template>

<style scoped>
.context-emoji {
  margin: 64px auto 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  opacity: 0.92;
}

/* 3D 透视舞台：hover 时 icon 在空间内翻转 */
.context-emoji__stage {
  perspective: 700px;
}

.context-emoji__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  line-height: 1;
  padding: 14px;
  border-radius: 22px;
  /* 玻璃小徽章：与特性画廊同一套玻璃语言 */
  background: rgba(255, 255, 255, 0.6);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  transition: transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease;
  will-change: transform;
}
.context-emoji:hover .context-emoji__icon {
  transform: rotateY(5deg) rotateX(4deg) scale(1.12);
  box-shadow: 0 12px 30px rgba(44, 62, 80, 0.22);
}

.context-emoji__tip {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.02em;
  color: var(--vp-c-text-3);
}

/* 暗色模式：玻璃徽章换深底 */
.dark .context-emoji__icon {
  background: rgba(40, 42, 48, 0.6);
  border-color: rgba(255, 255, 255, 0.09);
}

/* 移动端隐藏趣味装饰 */
@media (max-width: 768px) {
  .context-emoji {
    display: none;
  }
}
</style>
