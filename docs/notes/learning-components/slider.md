---
title: LearningSlider · 调整实验参数
date: 2026-09-11
tags: [VitePress, 组件库]
description: LearningSlider 组件参考：数值参数输入与状态联动的演示、接口与适用边界。
---

<script setup>
import { computed, ref } from 'vue'
import { LearningSlider, LearningCounter } from '../../../config/.vitepress/theme/components/learning'

const MIN_SESSION_MINUTES = 20
const MAX_SESSION_MINUTES = 120
const SESSION_STEP = 20
const DAYS_PER_WEEK = 7

const sessionMinutes = ref(60)
const weeklyHours = computed(() => sessionMinutes.value * DAYS_PER_WEEK / 60)
</script>

# LearningSlider · 调整实验参数

**何时用**：让读者改变一个数值参数、观察派生结果变化——"操作 → 观察 → 原理"链路的标准输入端。

**演示**：下面的滑块与计数器共享 `sessionMinutes` 状态源，拖到不同值观察联动。

<ClientOnly>
  <LearningSlider v-model="sessionMinutes" label="每次练习时长" :min="MIN_SESSION_MINUTES" :max="MAX_SESSION_MINUTES" :step="SESSION_STEP" unit=" 分钟" />
  <LearningCounter label="连续七天的累计时长" :value="weeklyHours" unit=" 小时" :decimals="1" />
</ClientOnly>

**接口**：

| 属性 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| label | string | 是 | 同时也是滑块的 aria-label |
| v-model | number | 是 | 父组件保证值在 [min, max] 内 |
| min / max | number | 是 | 取值范围 |
| step | number | 否 | 步长，默认 1 |
| unit | string | 否 | 展示单位，默认空 |

**调用**：

```vue
<LearningSlider v-model="minutes" label="练习时长" :min="20" :max="120" :step="20" unit=" 分钟" />
```

**边界**：只接受有限数值；范围语义（含/不含端点、比较方向）要在正文中说明，不能让读者猜。
