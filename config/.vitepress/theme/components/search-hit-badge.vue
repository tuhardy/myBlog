<script setup lang="ts">
/**
 * search-hit-badge.vue — 给本地搜索结果行加「标题 / 正文」命中徽标
 *
 * 数据流：config.mts 里 miniSearch.searchOptions.filter（官方钩子）
 * 在每次搜索时把每条结果的命中字段记入 globalThis.__vpSearchHits
 * （Map<id, 'title' | 'text'>）；本组件用 MutationObserver 监听弹窗
 * 结果列表，按结果行的 <a href>（即结果 id）反查并注入徽标。
 *
 * 兜底：钩子或观察失败时只是徽标缺失，不影响搜索本身。
 */
import { onBeforeUnmount, onMounted } from 'vue'

type HitMap = Map<string, 'title' | 'text'>

function applyBadges() {
  const box = document.querySelector('.VPLocalSearchBox')
  if (!box) return
  const map = (window as any).__vpSearchHits as HitMap | undefined
  if (!map) return
  // 结果行的 data-index 在 <a class="result"> 上，href 即结果 id
  for (const a of box.querySelectorAll('a.result')) {
    if (a.querySelector('.hit-badge')) continue
    const hit = map.get(a.getAttribute('href') ?? '')
    if (!hit) continue
    const badge = document.createElement('span')
    badge.className = `hit-badge hit-badge--${hit}`
    badge.textContent = hit === 'title' ? '标题' : '正文'
    a.querySelector('.titles')?.appendChild(badge)
  }
}

let observer: MutationObserver | undefined

onMounted(() => {
  observer = new MutationObserver(applyBadges)
  observer.observe(document.body, { childList: true, subtree: true })
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template />
