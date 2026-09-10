---
title: LearningQuiz · 单选自测与即时反馈
date: 2026-09-11
tags: [VitePress, 组件库]
description: LearningQuiz 组件参考：带对错反馈的单选自测演示、接口与适用边界。
---

<script setup>
import { LearningQuiz } from '../../../config/.vitepress/theme/components/learning'

const quoteOptions = [
  { value: 'word', label: '字符串会被拆成多个单词' },
  { value: 'literal', label: '变量保持为一个参数，空格被保留' },
  { value: 'expand', label: '变量会被二次展开成命令' },
]
</script>

# LearningQuiz · 单选自测与即时反馈

**何时用**：需要读者做出判断并得到对错裁决的检查点——比 [FlipCard](./flip-card) 多一层"评判"。答错可重选，选对后展示解释。

**演示**：

<ClientOnly>
  <LearningQuiz id="demo-quote-quiz" question="Bash 中用双引号包住 $dish 后，传给命令的参数会发生什么？" :options="quoteOptions" answer="literal" explanation="双引号保留空格不拆分参数，但变量仍会被展开——这正是它和单引号的分界线。" />
</ClientOnly>

**接口**：

| 属性 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 页内唯一，用作 radio 分组名 |
| question | string | 是 | 题干 |
| options | `{ value, label }[]` | 是 | 至少两个选项 |
| answer | string | 是 | 正确项的 value，必须命中某个选项 |
| explanation | string | 否 | 选对后展示的解释 |

**调用**：

```vue
<LearningQuiz id="my-quiz" question="……？" :options="options" answer="literal" explanation="……" />
```

**边界**：选项标签为纯文本；正确答案不写入 DOM 标记；反馈区使用 `role="status"` 播报，读屏可感知。
