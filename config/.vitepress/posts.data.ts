import { createContentLoader } from 'vitepress'
import {
  preparePages,
  urlToRelativePath,
  isoToTs,
} from '../../docs/_shared.data.ts'

/**
 * 最新文章列表：构建期扫描 docs 下所有 md，按「git 最后提交时间」倒序取前 3。
 *
 * 数据来源：
 *  - 不依赖 Frontmatter.date，统一用 git 提交时间作为「真实时间」。
 *  - 日期查询由 _shared.data.ts 一次性批处理（一次 git log），
 *    不再对每篇文章各 spawn 一次子进程。
 *  - 页面过滤、url→路径转换复用共享函数，与 stats.data.ts 保持一致。
 *
 * 摘要策略：
 *  先用 VitePress excerpt 机制（Frontmatter.excerpt / <!-- more --> / 自动截取）
 *  得到渲染后的 HTML，再 strip 为纯文本（首页卡片只展示纯文本，避免富文本
 *  混入标题/表格/代码块造成视觉噪音），由 CSS -webkit-line-clamp: 2 两行截断。
 */

/** 简易 HTML 转义（仅用于 frontmatter.excerpt 直接包 <p> 的兜底场景） */
function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 渲染后的摘要 HTML → 纯文本（去标签、转义实体、折叠空白、截断到 160 字） */
function stripToPlain(html: string): string {
  if (!html) return ''
  return html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)
}

/**
 * 摘要纯文本：优先 Frontmatter.description（一句话简介），
 * 否则 strip 掉 markdown-it 渲染出的 HTML。
 */
function buildPlainExcerpt(html: string, desc = ''): string {
  const fromDesc = desc.trim()
  if (fromDesc) return fromDesc
  return stripToPlain(html)
}

/** 渲染摘要 HTML：用户 excerpt → <!-- more --> 渲染 → 自动截取 */
function buildExcerptHtml(p: { frontmatter?: any; excerpt?: unknown }): string {
  if (p.excerpt) {
    const t = String(p.excerpt).trim()
    if (t) return t
  }
  if (p.frontmatter?.excerpt) {
    const t = String(p.frontmatter.excerpt).trim()
    return t ? `<p>${escapeHtml(t)}</p>` : ''
  }
  return ''
}

export default createContentLoader('**/*.md', {
  excerpt: true,        // 解析 Frontmatter.excerpt + <!-- more -->
  excerptLength: 800,   // 无 more 时自动取前 800 字符渲染
  transform(raw) {
    const { pages, dateMap } = preparePages(raw)

    return pages
      .map((p) => {
        const rel = urlToRelativePath(p.url)
        const gitDate = dateMap.get(rel) ?? ''
        const desc = ((p.frontmatter?.description as string) ||
          (p.frontmatter?.tagline as string) || '').trim()
        return {
          url: p.url,
          title:
            (p.frontmatter?.title as string) ||
            p.title ||
            p.url.split('/').pop()?.replace(/\.html?$/, '').replace(/\.md$/, '') ||
            '',
          desc,
          excerptHtml: buildExcerptHtml(p),
          gitDate,
          gitTs: isoToTs(gitDate),
        }
      })
      .sort((a, b) => {
        if (a.gitTs !== b.gitTs) return b.gitTs - a.gitTs
        return a.url.localeCompare(b.url)
      })
      .slice(0, 3)
      .map((p) => ({
        title: p.title,
        date: formatDisplay(p.gitDate),
        link: p.url,
        category: getCategoryName(p.url),
        excerpt: buildPlainExcerpt(p.excerptHtml, p.desc),
      }))
  },
})

/** 按 URL 前缀返回中文分类名 */
function getCategoryName(url: string): string {
  if (url.startsWith('/frontend/')) return '前端'
  if (url.startsWith('/backend/')) return '后端'
  if (url.startsWith('/middleware/')) return '中间件'
  if (url.startsWith('/database/')) return '数据库'
  if (url.startsWith('/design-mode/')) return '设计模式'
  if (url.startsWith('/notes/')) return '笔记'
  return '随笔'
}

/** ISO 8601 → YYYY-MM-DD HH:mm:ss（空串原样返回） */
function formatDisplay(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
