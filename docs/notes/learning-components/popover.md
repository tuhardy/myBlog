---
title: LearningPopover · 行内术语解释
date: 2026-09-11
tags: [VitePress, 组件库]
description: LearningPopover 组件参考：行内术语气泡的演示、接口与适用边界。
---

<script setup>
import { LearningPopover } from '../../../config/.vitepress/theme/components/learning'
</script>

# LearningPopover · 行内术语解释

**何时用**：正文中出现需要解释但不值得单独开节的术语——内联不打断阅读流，点击才展开。

**演示**：段落中的陌生概念——比如<LearningPopover term="管道（pipe）" content="把左侧命令的标准输出直接接到右侧命令的标准输入。错误输出默认不进管道，仍显示在终端。" />——点击展开说明，按 Esc 或点击空白处关闭。

**接口**：

| 属性 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| term | string | 是 | 触发词，以虚线下划线呈现 |
| content | string | 是 | 纯文本解释内容 |

**调用**：

```vue
比如<LearningPopover term="管道" content="把左侧输出接到右侧输入。" />这样的行内用法。
```

**边界**：`span` 内联元素，只能放在段落文本中，不能包裹块级内容；卡片限宽 320px/80vw，适合一两句话的解释，更长内容改用正文小节。
