<script setup lang="ts">
/**
 * search-hit-badge.vue — 本地搜索结果增强：命中徽标 + 模式筛选 + 计数说明
 *
 * 数据流：config.mts 里 miniSearch.searchOptions.filter（官方钩子）
 * 每次搜索逐条把命中类型记入 globalThis.__vpSearchHits（Map<id, hit>），
 * 按 globalThis.__vpSearchHitMode 剔除不匹配结果，并累计
 * __vpSearchTotal（过滤后真实总数）。
 *
 * 本组件用 MutationObserver 监听弹窗：
 *  - 搜索栏下注入「全部 | 文章 | 标题 | 正文」分段控件 + 计数 + 说明开关；
 *    点击模式写入全局并给查询词末尾交替增删空格，强制 v-model 侦听器
 *    触发以重跑搜索（值不变不会重查）；
 *  - 按结果行 <a href>（即结果 id）反查命中类型，行尾注入徽标；
 *  - 摘要自动滚动到首个 <mark>，让命中词进入视野。
 *
 * 性能约定（防突变风暴/死循环）：
 *  - 观察器回调经 requestAnimationFrame 合帧，每帧至多一遍；
 *  - 所有 DOM 写幂等——徽标/控件存在即跳过，textContent 同值短路，
 *    摘要滚动打 dataset 标记只滚一次；
 *  - 任一环节失败只是增强缺失，不影响搜索本身。
 */
import { onBeforeUnmount, onMounted } from 'vue'

type HitMap = Map<string, 'title' | 'text'>
type HitMode = 'all' | 'page' | 'title' | 'text'

const MODE_OPTIONS: ReadonlyArray<readonly [HitMode, string]> = [
  ['all', '全部'],
  ['page', '文章'],
  ['title', '标题'],
  ['text', '正文'],
]

const MODE_TIPS: Record<HitMode, string> = {
  all: '所有命中逐条列出，点击直达对应小节',
  page: '每篇文章只显示得分最高的一处命中',
  title: '仅保留页面总标题命中的文章',
  text: '仅保留小节标题与正文内容的命中',
}

const getMode = (): HitMode => (window as any).__vpSearchHitMode ?? 'all'

function setMode(mode: HitMode, box: Element) {
  ;(window as any).__vpSearchHitMode = mode
  syncButtons(box)
  const input = box.querySelector<HTMLInputElement>('.search-input')
  if (input && input.value.trim()) {
    input.value = input.value.endsWith(' ')
      ? input.value.trimEnd()
      : `${input.value} `
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

function syncButtons(box: Element) {
  const mode = getMode()
  for (const btn of box.querySelectorAll<HTMLElement>('.hit-filter__btn')) {
    const on = btn.dataset.mode === mode
    btn.classList.toggle('is-on', on)
    btn.setAttribute('aria-pressed', String(on))
  }
}

function ensureFilterControl(box: Element) {
  if (box.querySelector('.hit-filter')) return
  const bar = box.querySelector('.search-bar')
  if (!bar) return
  // 每次新输入清零 seen 集合与计数：input 事件先于防抖后的搜索执行
  const input = bar.querySelector<HTMLInputElement>('.search-input')
  if (input && !input.dataset.hitResetBound) {
    input.dataset.hitResetBound = '1'
    input.addEventListener('input', () => {
      ;(window as any).__vpSearchSeen?.clear()
      ;(window as any).__vpSearchTotal = 0
    })
  }
  const wrap = document.createElement('div')
  wrap.className = 'hit-filter'
  wrap.setAttribute('role', 'group')
  wrap.setAttribute('aria-label', '按命中位置筛选')
  for (const [mode, label] of MODE_OPTIONS) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'hit-filter__btn'
    btn.dataset.mode = mode
    btn.textContent = label
    btn.setAttribute('aria-pressed', 'false')
    btn.addEventListener('click', () => setMode(mode, box))
    wrap.appendChild(btn)
  }
  const count = document.createElement('span')
  count.className = 'hit-filter__count'
  wrap.appendChild(count)
  // ? 说明：包进 relative 容器，说明卡绝对定位于按钮下方；
  // 桌面 hover 由 CSS 驱动，click 切换 is-open 供触屏
  const infoWrap = document.createElement('span')
  infoWrap.className = 'hit-filter__info-wrap'
  const info = document.createElement('button')
  info.type = 'button'
  info.className = 'hit-filter__info'
  info.textContent = '?'
  info.setAttribute('aria-label', '搜索模式说明')
  info.setAttribute('aria-expanded', 'false')
  const legend = document.createElement('div')
  legend.className = 'hit-legend'
  legend.innerHTML =
    '<div class="hit-legend__title">筛选模式</div>' +
    MODE_OPTIONS.map(
      ([mode, label]) =>
        `<div class="hit-legend__row"><span class="hit-legend__tag">${label}</span><span>${MODE_TIPS[mode]}</span></div>`,
    ).join('')
  infoWrap.appendChild(info)
  infoWrap.appendChild(legend)
  wrap.appendChild(infoWrap)
  bar.insertAdjacentElement('afterend', wrap)
  info.addEventListener('click', () => {
    const open = legend.classList.toggle('is-open')
    info.setAttribute('aria-expanded', String(open))
  })
  syncButtons(box)
}

function applyBadges() {
  const box = document.querySelector('.VPLocalSearchBox')
  if (!box) return
  ensureFilterControl(box)
  const count = box.querySelector<HTMLElement>('.hit-filter__count')
  if (count) {
    const query =
      box.querySelector<HTMLInputElement>('.search-input')?.value.trim() ?? ''
    const total = (window as any).__vpSearchTotal ?? 0
    const text = query ? `共 ${total} 条` : ''
    if (count.textContent !== text) count.textContent = text
  }
  const map = (window as any).__vpSearchHits as HitMap | undefined
  if (!map) return
  for (const a of box.querySelectorAll('a.result')) {
    if (!a.querySelector('.hit-badge')) {
      const hit = map.get(a.getAttribute('href') ?? '')
      if (hit) {
        const badge = document.createElement('span')
        badge.className = `hit-badge hit-badge--${hit}`
        badge.textContent = hit === 'title' ? '标题' : '正文'
        a.querySelector('.titles')?.appendChild(badge)
      }
    }
    // 摘要定位首个高亮词：默认渲染小节开头，命中点靠下时看不到；
    // mark.js 在结果渲染后才插入高亮，靠观察器后续触发补滚一次
    const excerpt = a.querySelector<HTMLElement>('.excerpt')
    if (excerpt && !excerpt.dataset.hitScrolled) {
      const mark = excerpt.querySelector('mark')
      if (mark) {
        excerpt.dataset.hitScrolled = '1'
        excerpt.scrollTop = Math.max(0, mark.offsetTop - excerpt.clientHeight / 3)
      }
    }
  }
}

// 落地页高亮接力：结果点击与回车导航都把「查询词+目标地址」写进
// sessionStorage，由 search-page-highlight 在落地页消费
// （30s 内有效、读完即删、并校验落地路径与目标一致防误高亮）
function stashQuery(href: string) {
  const q = document
    .querySelector<HTMLInputElement>('.VPLocalSearchBox .search-input')
    ?.value.trim()
  if (!q) return
  try {
    sessionStorage.setItem(
      'vp-search-hl',
      JSON.stringify({ q, to: href, ts: Date.now() }),
    )
  } catch {}
}

function onResultClick(e: MouseEvent) {
  const a = (e.target as Element).closest?.<HTMLAnchorElement>(
    '.VPLocalSearchBox a.result',
  )
  const href = a?.getAttribute('href')
  if (href) stashQuery(href)
}

function onResultKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter') return
  const box = (e.target as Element).closest?.('.VPLocalSearchBox')
  if (!box) return
  // 只有焦点在输入框且当前有结果时 Enter 才会触发选中跳转
  if (!(e.target as Element).matches('.search-input')) return
  const href = box
    .querySelector<HTMLAnchorElement>('a.result.selected, a.result')
    ?.getAttribute('href')
  if (href) stashQuery(href)
}

let observer: MutationObserver | undefined
let scheduled = false

onMounted(() => {
  document.addEventListener('click', onResultClick, true)
  document.addEventListener('keydown', onResultKeydown, true)
  observer = new MutationObserver(() => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      applyBadges()
    })
  })
  observer.observe(document.body, { childList: true, subtree: true })
})

onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('click', onResultClick, true)
  document.removeEventListener('keydown', onResultKeydown, true)
})
</script>

<template />
