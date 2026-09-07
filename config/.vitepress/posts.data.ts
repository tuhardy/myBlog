import { createContentLoader } from 'vitepress'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 最新文章列表：构建期自动扫描 docs 目录下所有 md 文件，按「git 最后提交时间」倒序取前 3。
 *
 * 设计要点：
 * 1) 不依赖 Frontmatter.date，全部用 git commit 时间作为「真实时间」。
 *    命令：git log -1 --format=%cI -- 文件路径
 *    输出：ISO 8601 带时区，形如 2026-08-25T22:36:00+08:00，符合用户需求。
 * 2) 排除目录 index 入口、首页本身、脚手架示例 markdown-examples 与 api-examples。
 * 3) 时间相同时按 url 字母序兜底，保证排序稳定可预测。
 * 4) 摘要 = **保留原本 Markdown 布局结构的富文本 HTML**（非纯文本）：
 *    优先级：
 *      a. 用户在 Frontmatter 写 excerpt: xxx → 当作纯文本包 <p>
 *      b. 正文里放了 <!-- more --> → 该标记之前的完整 Markdown 渲染为 HTML（首选，结构最真实）
 *      c. 没写 more 时 → excerptLength: 400 自动截取前 400 字符，VitePress 内部渲染 HTML
 * 5) dev 模式下未 commit 的文件 git log 取不到值，fallback 为空串。
 *
 * 注意：本文件注释里不要写「星号星号斜杠」之类的 glob 模式，
 * 否则会被 JS 解析器误认为注释结束符，导致 parse error。
 */

// posts.data.ts 位于 config/.vitepress/，docs 在它的上两级 + docs/
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const docsRoot = path.resolve(__dirname, '../../docs')

/**
 * 拿一个文件相对 srcDir 路径对应的 git 最后提交时间（ISO 8601 带时区）。
 * 文件没 commit 过返回空串。
 */
function getGitLastCommitISO(relativePath: string): string {
  try {
    const absPath = path.join(docsRoot, relativePath)
    const cmd = `git log -1 --format=%cI -- "${absPath}"`
    const out = execSync(cmd, {
      encoding: 'utf-8',
      cwd: docsRoot,
      stdio: ['pipe', 'pipe', 'ignore'],
    })
    return out.trim()
  } catch {
    return ''
  }
}

/**
 * 从 VitePress createContentLoader 的 page.url 反推 srcDir 下的相对文件路径。
 * 例：/frontend/getting-started.html → frontend/getting-started.md
 */
function urlToRelativePath(url: string): string {
  return url.replace(/^\//, '').replace(/\.html?$/, '.md')
}

/** 简易 HTML 转义（仅用于 frontmatter.excerpt 直接包 <p> 的场景） */
function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 生成「保留原文布局结构」的富文本摘要 HTML。
 * 全部交给 VitePress 内部 markdown-it 引擎渲染，避免自己 strip 丢失格式。
 */
function buildExcerptHtml(p: { frontmatter?: any; excerpt?: unknown }): string {
  // 首选：VitePress 生成的 excerpt（HTML 片段）
  // 来源 = 用户写了 <!-- more -->，或没写时由 excerptLength 自动截取后渲染
  if (p.excerpt) {
    const t = String(p.excerpt).trim()
    if (t) return t
  }
  // 兜底：Frontmatter 中用户手写 excerpt（当作纯文本包 <p>）
  if (p.frontmatter?.excerpt) {
    const t = String(p.frontmatter.excerpt).trim()
    return t ? `<p>${escapeHtml(t)}</p>` : ''
  }
  return ''
}

/**
 * 首页卡片摘要：纯文本（不再把富文本 HTML 塞进卡片）。
 * 富文本摘要在卡片里会重复文章标题、混入 <hr>/表格/代码块，视觉噪音大；
 * 首页卡片采用「纯文本 + CSS 三行截断」是 Medium / 掘金 / 知乎一致的做法，
 * 干净、可预测、绝不撑破布局。
 * 处理顺序：优先 Frontmatter.description（一句话简介）→ 否则 strip 摘要 HTML。
 */
function buildPlainExcerpt(html: string, desc = ''): string {
  const fromDesc = desc.trim()
  if (fromDesc) return fromDesc
  if (!html) return ''
  const text = html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')           // 去掉所有 HTML 标签
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')              // 折叠所有空白（含换行）
    .trim()
  return text.slice(0, 160)
}

export default createContentLoader('**/*.md', {
  includeSource: true,  // 保留，后续如果需要自定义处理正文兜底可用
  excerpt: true,        // 开启 excerpt 机制：解析 Frontmatter.excerpt + <!-- more -->
  excerptLength: 800,   // 用户没写 <!-- more --> 时，自动取前 800 字符 Markdown 渲染为 HTML（给足 2~3 个完整段落空间，避免切到半截句子）
  transform(raw) {
    return raw
      .filter((p) => {
        if (p.url === '/' || p.url === '/index' || p.url === '/index.html') return false
        if (p.url.endsWith('/')) return false
        if (p.url.endsWith('/index')) return false
        if (p.url.endsWith('/index.html')) return false
        if (/\/(api-examples|markdown-examples)(\.html?)?$/.test(p.url)) return false
        return true
      })
      .map((p) => {
        const rel = urlToRelativePath(p.url)
        const gitDate = getGitLastCommitISO(rel)
        return {
          url: p.url,
          title:
            (p.frontmatter?.title as string) ||
            p.title ||
            p.url.split('/').pop()?.replace(/\.html?$/, '').replace(/\.md$/, '') ||
            '',
          desc:
            ((p.frontmatter?.description as string) ||
              (p.frontmatter?.tagline as string) ||
              '').trim(),
          excerpt: buildExcerptHtml(p), // 富文本 HTML，前端用 v-html 渲染
          gitDate,
          gitTs: gitDate ? +new Date(gitDate) : 0,
        }
      })
      .sort((a, b) => {
        if (a.gitTs !== b.gitTs) return b.gitTs - a.gitTs
        return a.url.localeCompare(b.url)
      })
      .slice(0, 3)
      .map((p) => {
        return {
          title: p.title,
          date: formatDisplay(p.gitDate),
          link: p.url,
          category: getCategoryName(p.url),
          excerpt: buildPlainExcerpt(p.excerpt, p.desc),
        }
      })
  },
})

/**
 * 根据文章 URL 前缀判断中文分类名（杂志风统一单色，不再返回彩色徽标）。
 */
function getCategoryName(url: string): string {
  if (url.startsWith('/frontend/')) return '前端'
  if (url.startsWith('/backend/')) return '后端'
  if (url.startsWith('/middleware/')) return '中间件'
  if (url.startsWith('/database/')) return '数据库'
  if (url.startsWith('/design-mode/')) return '设计模式'
  if (url.startsWith('/notes/')) return '笔记'
  return '随笔'
}

/**
 * 把 ISO 8601 带时区字符串格式化为「YYYY-MM-DD HH:mm:ss」用于首页展示。
 * 空串原样返回。
 */
function formatDisplay(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}
