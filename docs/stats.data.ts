import { createContentLoader } from 'vitepress'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 站点统计数据（杂志风 Banner 数据条使用）：
 *  - total：      已发布文章数（过滤首页 / 目录入口 / 脚手架示例）
 *  - categories： 栏目数（按 URL 第一段去重）
 *  - latestLabel：最近一篇文章的 git 提交日期（YYYY.MM.DD）
 *
 * 注意：data loader 必须位于 srcDir（docs/）内才会被 VitePress 转换，
 * 主题组件通过相对路径引用本文件。
 */

const docsRoot = path.dirname(fileURLToPath(import.meta.url))

function gitLastCommitTs(rel: string): number {
  try {
    const absPath = path.join(docsRoot, rel)
    const out = execSync(`git log -1 --format=%cI -- "${absPath}"`, {
      encoding: 'utf-8',
      cwd: docsRoot,
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim()
    return out ? +new Date(out) : 0
  } catch {
    return 0
  }
}

export default createContentLoader('**/*.md', {
  transform(raw) {
    const pages = raw.filter((p) => {
      if (p.url === '/' || p.url === '/index' || p.url === '/index.html') return false
      if (p.url.endsWith('/')) return false
      if (p.url.endsWith('/index')) return false
      if (p.url.endsWith('/index.html')) return false
      if (/\/(api-examples|markdown-examples)(\.html?)?$/.test(p.url)) return false
      return true
    })

    const categories = new Set(
      pages.map((p) => p.url.split('/')[1]).filter(Boolean),
    )

    let latestTs = 0
    for (const p of pages) {
      const rel = p.url.replace(/^\//, '').replace(/\.html?$/, '.md')
      latestTs = Math.max(latestTs, gitLastCommitTs(rel))
    }

    const d = latestTs ? new Date(latestTs) : null
    const latestLabel = d
      ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
      : '—'

    return {
      total: pages.length,
      categories: categories.size,
      latestLabel,
    }
  },
})
