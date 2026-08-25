import { createContentLoader } from 'vitepress'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 最新文章列表：构建期自动扫描 docs/**/*.md，按「git 最后提交时间」倒序取前 3。
 *
 * 设计要点：
 * 1) 不依赖 Frontmatter.date，全部用 git commit 时间作为「真实时间」。
 *    命令：git log -1 --format=%cI -- <file>
 *    输出：ISO 8601 带时区，形如 2026-08-25T22:36:00+08:00，符合用户需求。
 * 2) 排除目录 index 入口、首页本身、脚手架示例 /markdown-examples / /api-examples。
 * 3) 时间相同时按 url 字母序兜底，保证排序稳定可预测。
 * 4) dev 模式下未 commit 的文件 git log 取不到值，fallback 为空串，
 *    这些文件会沉到列表底部；commit 一次后即可正常排序。
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
    // %cI = committer date, strict ISO 8601 格式
    // cwd 必须是 git 仓库根目录，否则 git log 失败
    const absPath = path.join(docsRoot, relativePath)
    const out = execSync(`git log -1 --format=%cI -- ${JSON.stringify(absPath)}`, {
      encoding: 'utf-8',
      cwd: docsRoot,
      stdio: ['pipe', 'pipe', 'ignore'], // 静默 stderr，文件没 commit 时不报红
    })
    return out.trim()
  } catch {
    return ''
  }
}

export default createContentLoader('**/*.md', {
  transform(raw) {
    const excludeSet = new Set(['/markdown-examples', '/api-examples'])

    return raw
      .filter((p) => {
        // 去掉首页本身
        if (p.url === '/') return false
        // 去掉目录 index 入口（VitePress 把 foo/index.md 渲染为 foo/，或以 /index 结尾）
        if (p.url.endsWith('/')) return false
        if (p.url.endsWith('/index')) return false
        // 去掉脚手架示例
        if (excludeSet.has(p.url)) return false
        return true
      })
      .map((p) => {
        const gitDate = getGitLastCommitISO(p.relativePath)
        return {
          url: p.url,
          title:
            (p.frontmatter?.title as string) ||
            p.title ||
            p.url.split('/').pop()?.replace(/\.md$/, '') ||
            '',
          desc:
            ((p.frontmatter?.description as string) ||
              (p.frontmatter?.tagline as string) ||
              '').trim(),
          // 直接是 ISO 8601 带时区字符串（如 2026-08-25T22:36:00+08:00），
          // 也可能为空串（文件还没 commit 过）
          gitDate,
          gitTs: gitDate ? +new Date(gitDate) : 0,
        }
      })
      .sort((a, b) => {
        // git 时间倒序（新 → 旧）
        if (a.gitTs !== b.gitTs) return b.gitTs - a.gitTs
        // 时间相同时按 url 字母序兜底（保证稳定排序）
        return a.url.localeCompare(b.url)
      })
      .slice(0, 3)
      .map((p) => ({
        title: p.title,
        // 首页列表显示带时分秒的格式：YYYY-MM-DD HH:mm:ss
        // 直接用 ISO 串截取前 19 位替换 T 为空格，可读性最好
        date: formatDisplay(p.gitDate),
        // 内部链接（VitePress 内部路由，由 index.md 的 toHref 拼上 BASE_URL）
        link: p.url,
        desc: p.desc,
      }))
  },
})

/**
 * 把 ISO 8601 带时区字符串格式化为「YYYY-MM-DD HH:mm:ss」用于首页展示。
 * 空串原样返回。
 */
function formatDisplay(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  // 用本地时区（用户在 cn.vuejs.org 看的也是本地时区），输出 YYYY-MM-DD HH:mm:ss
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}
