<script setup lang="ts">
/**
 * search-page-highlight.vue — 搜索结果落地页关键字高亮
 *
 * 接力：search-hit-badge 在点击/回车结果时把查询词写入
 * sessionStorage.vp-search-hl（{q, ts}）；本组件在每次路由变化后
 * 消费它（30s 内有效，读完即删）。
 *
 * 高亮：优先 CSS Custom Highlight API（不插 DOM，零污染，一行清除）；
 * 不支持的浏览器回退 <mark class="vp-search-mark"> 包裹（按节点
 * 倒序 splitText，保证偏移量不失效）。
 *
 * 分词与索引侧同源（Intl.Segmenter 'zh' 词级），多词各自命中；
 * 仅扫 .vp-doc 正文区；首个命中滚动到视口中部（尊重 reduced-motion）。
 */
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vitepress'

const STORE_KEY = 'vp-search-hl'
const HL_NAME = 'vp-search-hit'
const MAX_AGE_MS = 30_000
const SKIP_TAGS = /^(SCRIPT|STYLE|TEXTAREA|NOSCRIPT|MARK)$/

const route = useRoute()
let fallbackMarks: HTMLElement[] = []

interface Match {
  node: Text
  start: number
  end: number
}

function clearHighlights() {
  try {
    ;(CSS as any).highlights?.delete(HL_NAME)
  } catch {}
  for (const m of fallbackMarks) {
    const parent = m.parentNode
    if (parent) {
      parent.replaceChild(document.createTextNode(m.textContent ?? ''), m)
      parent.normalize()
    }
  }
  fallbackMarks = []
}

function extractTerms(query: string): string[] {
  const terms = new Set<string>()
  try {
    const segmenter = new Intl.Segmenter('zh', { granularity: 'word' })
    for (const { segment, isWordLike } of segmenter.segment(query)) {
      if (isWordLike) terms.add(segment.toLowerCase())
    }
  } catch {
    if (query.trim()) terms.add(query.trim().toLowerCase())
  }
  return [...terms].sort((a, b) => b.length - a.length)
}

function collectMatches(root: Element, terms: string[]): Match[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement
      if (!parent || SKIP_TAGS.test(parent.tagName))
        return NodeFilter.FILTER_REJECT
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  const matches: Match[] = []
  let node: Text | null
  while ((node = walker.nextNode() as Text | null)) {
    const text = (node.textContent ?? '').toLowerCase()
    for (const term of terms) {
      let from = 0
      let idx = text.indexOf(term, from)
      while (idx !== -1) {
        matches.push({ node, start: idx, end: idx + term.length })
        from = idx + term.length
        idx = text.indexOf(term, from)
      }
    }
  }
  return matches
}

function applyHighlight(matches: Match[]): Text | undefined {
  if ((CSS as any).highlights) {
    const ranges = matches.map(({ node, start, end }) => {
      const range = new Range()
      range.setStart(node, start)
      range.setEnd(node, end)
      return range
    })
    ;(CSS as any).highlights.set(HL_NAME, new (window as any).Highlight(...ranges))
    return matches[0]?.node
  }
  // 回退：<mark> 包裹。按节点分组、组内倒序处理，先拆后面的
  // 命中不影响前面命中的偏移量
  const byNode = new Map<Text, Match[]>()
  for (const m of matches) {
    const list = byNode.get(m.node)
    if (list) list.push(m)
    else byNode.set(m.node, [m])
  }
  for (const [node, list] of byNode) {
    list.sort((a, b) => b.start - a.start)
    for (const { start, end } of list) {
      const tail = node.splitText(start)
      const rest = tail.splitText(end - start)
      const mark = document.createElement('mark')
      mark.className = 'vp-search-mark'
      tail.parentNode?.insertBefore(mark, rest)
      mark.appendChild(tail)
      fallbackMarks.push(mark)
    }
  }
  return matches[0]?.node
}

function consumeStash() {
  let stash: { q?: string; to?: string; ts?: number } | null = null
  try {
    stash = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? 'null')
    sessionStorage.removeItem(STORE_KEY)
  } catch {}
  clearHighlights()
  if (!stash?.q || !stash.ts || Date.now() - stash.ts > MAX_AGE_MS) return
  // 校验落地页与点击的结果一致，防止标记残留误伤无关页面。
  // 只比对页面路径——中文锚点在 href 属性与 location.hash 中的
  // 百分号编码可能不一致；同时归一化 .html / index / 尾斜杠
  if (stash.to) {
    const normalize = (p: string) =>
      p
        .split('#')[0]
        .replace(/index\.html$/, '')
        .replace(/\.html$/, '')
        .replace(/\/$/, '')
    if (normalize(stash.to) !== normalize(location.pathname)) return
  }
  const root = document.querySelector('.vp-doc')
  if (!root) return
  const terms = extractTerms(stash.q)
  if (!terms.length) return
  const matches = collectMatches(root, terms)
  if (!matches.length) return
  const first = applyHighlight(matches)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  first?.parentElement?.scrollIntoView({
    block: 'center',
    behavior: reduced ? 'auto' : 'smooth',
  })
}

onMounted(() => {
  consumeStash()
  watch(
    () => route.path,
    async () => {
      await nextTick()
      requestAnimationFrame(consumeStash)
    },
  )
})

onBeforeUnmount(clearHighlights)
</script>

<template />
