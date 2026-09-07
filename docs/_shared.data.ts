import { createContentLoader } from 'vitepress'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 共享数据层：两个 data loader（posts.data.ts / stats.data.ts）的公共底座。
 *
 * 原先每个 loader 都对每个 md 文件各自调用一次 execSync('git log')，
 * docs 下 21 篇正文 × 2 loader = 约 42 次同步子进程 spawn，且页面过滤、
 * url→相对路径转换逻辑逐行重复。本模块集中处理：
 *   1. 一次 git log --name-only 批量拿到所有文件的最后提交 ISO 时间（Map<relPath, iso>）；
 *   2. isContentPage(url)：统一的页面过滤规则（排除首页 / 目录入口 / 脚手架示例）；
 *   3. urlToRelativePath(url)：URL 反推 srcDir 下的相对 md 路径。
 *
 * 注意：data loader 必须位于 srcDir（docs/）内才会被 VitePress 转换。
 * 文件名以 `_` 开头，content loader 默认只扫描 markdown 文件，
 * 本文件只是被其它 data loader 通过 import 复用，不会成为独立 loader。
 */

const docsRoot = path.dirname(fileURLToPath(import.meta.url))
// git 仓库根 = docs 的上一级；git log --name-only 输出相对仓库根的路径
const repoRoot = path.resolve(docsRoot, '..')

/**
 * 一次性批量查询：返回「srcDir 相对 md 路径 → ISO 8601 时间字符串」的映射。
 *
 * 使用 `git log --no-merges --name-only --format=%ci`：
 *   - 每条提交以 `%ci`（committer date）为头部，后跟该提交修改的文件名；
 *   - 按提交时间倒序输出，因此「第一次出现某文件」即其最后一次提交时间；
 *   - 一次 spawn 拿到全部，替代原来每文件一次 git log。
 * 解析时把路径归一化为以 docs 根为基准的相对路径（与 urlToRelativePath 输出一致）。
 */
function loadAllGitDates(): Map<string, string> {
  const dateMap = new Map<string, string>()
  try {
    const out = execSync('git log --no-merges --name-only --format=%ci', {
      encoding: 'utf-8',
      cwd: docsRoot,
      stdio: ['pipe', 'pipe', 'ignore'],
      maxBuffer: 10 * 1024 * 1024,
    })
    let currentDate = ''
    for (const line of out.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed) continue
      // 形如「2026-08-25 22:38:46 +0800」的日期行 → ISO「2026-08-25T22:38:46+0800」
      if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+[+-]\d{4}$/.test(trimmed)) {
        currentDate = trimmed.replace(' ', 'T').replace(' ', '')
        continue
      }
      // 文件名行：git 以仓库根为基准输出，转为 docs/ 相对路径（统一正斜杠，与 urlToRelativePath 对齐）
      const docsRel = path.relative(docsRoot, path.join(repoRoot, trimmed)).split(path.sep).join('/')
      // 只关心 .md 且不在 dateMap 中（首次出现 = 最后一次提交）
      if (docsRel.endsWith('.md') && !dateMap.has(docsRel)) {
        dateMap.set(docsRel, currentDate)
      }
    }
  } catch {
    // git 不可用或非 git 仓库：返回空 Map，调用方兜底处理
  }
  return dateMap
}

/**
 * 是否为内容页（排除首页本身、各目录 index 入口、脚手架示例页）。
 * 两个 loader 共用同一套过滤规则，避免出现「文章数」与「Banner 统计数」不一致。
 */
export function isContentPage(url: string): boolean {
  if (url === '/' || url === '/index' || url === '/index.html') return false
  if (url.endsWith('/')) return false
  if (url.endsWith('/index') || url.endsWith('/index.html')) return false
  if (/\/(api-examples|markdown-examples)(\.html?)?$/.test(url)) return false
  return true
}

/**
 * 从 VitePress page.url 反推 srcDir 下的相对 md 路径。
 * 例：/frontend/getting-started.html → frontend/getting-started.md
 */
export function urlToRelativePath(url: string): string {
  return url.replace(/^\//, '').replace(/\.html?$/, '.md')
}

/**
 * 把 ISO 8601（含时区）解析为毫秒时间戳，非法输入返回 0。
 */
export function isoToTs(iso: string): number {
  if (!iso) return 0
  const ts = +new Date(iso)
  return Number.isNaN(ts) ? 0 : ts
}

/**
 * 暴露给两个 loader 复用的扫描入口：返回过滤后的内容页数组 + 日期 Map。
 * 调用方传入自己的 transform 所需的字段拼装即可。
 *
 * 注意：createContentLoader 的 transform 拿到的 raw 已是全部 md 的解析结果，
 * 这里我们只做过滤与日期注入，不做取数（git 只在本函数内跑一次）。
 */
export function preparePages(raw: Array<{ url: string; [k: string]: any }>) {
  const pages = raw.filter((p) => isContentPage(p.url))
  const dateMap = loadAllGitDates()
  return { pages, dateMap }
}

// 占位导出：本文件不是独立 loader，需要一个 default 以兼容 .data.ts 的 loader 机制
export default createContentLoader('**/*.md', {
  transform() {
    // 不会被调用（posts/stats 各自定义自己的 loader 并 import 上面的工具），
    // 保留 default 仅为防止 VitePress 把本文件误识别为缺失导出
    return []
  },
})
