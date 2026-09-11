---
title: LearningCodeStepper · 代码逐行讲解
date: 2026-09-12
tags: [VitePress, 组件库]
description: LearningCodeStepper 组件参考：按步高亮代码行/行组并配讲解，适合执行顺序与源码导读。
---

<script setup>
import { LearningCodeStepper } from '../../../config/.vitepress/theme/components/learning'

const sqlCode = `SELECT status, COUNT(*) AS cnt
FROM orders
WHERE created_at >= '2026-01-01'
GROUP BY status
HAVING cnt > 10
ORDER BY cnt DESC
LIMIT 5;`

const execSteps = [
  { lines: [2], note: 'FROM 最先执行：确定数据来源 orders 表。' },
  { lines: [3], note: 'WHERE 过滤行：只保留 2026 年之后的订单。' },
  { lines: [4], note: 'GROUP BY 把过滤后的行按 status 分组。' },
  { lines: [5], note: 'HAVING 过滤分组：留下 cnt > 10 的组。' },
  { lines: [1], note: 'SELECT 最后才取列——所以 WHERE 里不能引用别名 cnt。' },
  { lines: [6, 7], note: 'ORDER BY 排序、LIMIT 截断，输出最终结果。' },
]
</script>

# LearningCodeStepper · 代码逐行讲解

**何时用**：讲解的重点是「代码各部分按什么顺序起作用」——执行顺序、求值次序、源码导读。每一步高亮一行或多行并配一句讲解；支持乱序和非连续行，正好表达「书写顺序 ≠ 执行顺序」这类反直觉主题。

**演示**：SQL 各子句的真实执行顺序（点「下一步」观察高亮跳动）：

<ClientOnly>
  <LearningCodeStepper id="demo-sql-order" label="SQL 执行顺序" :code="sqlCode" :steps="execSteps" />
</ClientOnly>

**接口**：

| 属性 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 页内唯一 |
| label | string | 是 | 组件可访问名称 |
| code | string | 是 | 多行代码文本（`\n` 分行，保留缩进） |
| steps | `{ lines: number[]; note: string }[]` | 是 | 每步高亮的 1-based 行号数组 + 讲解文字；越界行号自动忽略 |

**调用**：

```vue
<LearningCodeStepper id="my-stepper" label="执行顺序" :code="code" :steps="steps" />
```

**边界**：内部管理当前步，无 v-model；根节点 `data-step` 暴露当前步下标（0 起）。非高亮行降低透明度以聚焦讲解；代码区超高时内部滚动，切换步骤会自动把高亮行滚入视口；尊重 `prefers-reduced-motion`。步与步之间应有真实讲解价值——如果只是并列展示几段代码，用 [Tabs](./tabs)。
