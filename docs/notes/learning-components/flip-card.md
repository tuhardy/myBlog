---
title: LearningFlipCard · 自测问答
date: 2026-09-11
tags: [VitePress, 组件库]
description: LearningFlipCard 组件参考：翻面自测卡的演示、接口与适用边界。
---

<script setup>
import { LearningFlipCard } from '../../../config/.vitepress/theme/components/learning'
</script>

# LearningFlipCard · 自测问答

**何时用**：让读者先回忆再对照答案的轻量自测——不判分、不判对错，只制造"先想一想"的停顿。需要判定时用 [Quiz](./quiz)。

**演示**：

<ClientOnly>
  <LearningFlipCard question="为什么 uniq -c 之前必须先 sort？" answer="uniq 只合并相邻的重复行。未排序的相同行不相邻时会被分别计数，结果会虚高。" />
</ClientOnly>

**接口**：

| 属性 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| question | string | 是 | 纯文本问题 |
| answer | string | 是 | 纯文本答案 |

**调用**：

```vue
<LearningFlipCard question="……？" answer="……" />
```

**边界**：不接受富 HTML；卡片固定高度，长答案内部滚动；翻面有 3D 动画，减少动态效果下瞬时切换。
