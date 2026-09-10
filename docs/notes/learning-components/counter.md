---
title: LearningCounter · 展示数量变化
date: 2026-09-11
tags: [VitePress, 组件库]
description: LearningCounter 组件参考：数值动画展示的演示、接口与适用边界。
---

<script setup>
import { LearningCounter } from '../../../config/.vitepress/theme/components/learning'

const PUBLISHED_CHAPTERS = 5
</script>

# LearningCounter · 展示数量变化

**何时用**：把一个派生数值的变化做成可见的动画输出——通常作为 [Slider](./slider) 或其他状态源的"观察端"，自身不接受输入。

**演示**：固定值在挂载时从 0 补间到目标；真实教程中一般绑定共享状态源（见 Slider 页的联动演示）。

<ClientOnly>
  <LearningCounter label="已发布的练习章节" :value="PUBLISHED_CHAPTERS" unit=" 章" />
</ClientOnly>

**接口**：

| 属性 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| label | string | 是 | 指标名称 |
| value | number | 是 | 有限数值；变化时播放补间动画 |
| unit | string | 否 | 默认空 |
| duration | number | 否 | 动画时长，默认 600ms |
| decimals | number | 否 | 小数位 0–6，默认 0 |

**调用**：

```vue
<LearningCounter label="累计时长" :value="weeklyHours" unit=" 小时" :decimals="1" />
```

**边界**：纯展示组件，没有 v-model；动画只在挂载后运行、卸载即取消，减少动态效果下直接落定目标值。
