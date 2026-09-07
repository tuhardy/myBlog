import { createContentLoader } from 'vitepress'
import { preparePages, isoToTs } from './_shared.data.ts'

/**
 * 站点统计数据（杂志风 Banner 数据条使用）：
 *  - total：      已发布文章数（过滤首页 / 目录入口 / 脚手架示例）
 *  - categories： 栏目数（按 URL 第一段去重）
 *  - latestLabel：最近一篇文章的 git 提交日期（YYYY.MM.DD）
 *
 * 日期查询复用 _shared.data.ts 的批处理结果（一次 git log），
 * 与 posts.data.ts 共用同一套过滤口径，保证两处统计数字一致。
 */
export default createContentLoader('**/*.md', {
  transform(raw) {
    const { pages, dateMap } = preparePages(raw)

    const categories = new Set(
      pages.map((p) => p.url.split('/')[1]).filter(Boolean),
    )

    let latestTs = 0
    for (const p of pages) {
      const iso = dateMap.get(p.url.replace(/^\//, '').replace(/\.html?$/, '.md')) ?? ''
      latestTs = Math.max(latestTs, isoToTs(iso))
    }

    const d = latestTs ? new Date(latestTs) : null
    const pad = (n: number) => String(n).padStart(2, '0')
    const latestLabel = d
      ? `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
      : '—'

    return {
      total: pages.length,
      categories: categories.size,
      latestLabel,
    }
  },
})
