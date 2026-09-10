---
title: LearningSteps · 分步流程演示
date: 2026-09-11
tags: [VitePress, 组件库]
description: LearningSteps 组件参考：有序流程分步推进的演示、接口与适用边界。
---

<script setup>
import { ref } from 'vue'
import { LearningSteps } from '../../../config/.vitepress/theme/components/learning'

const publishSteps = [
  { value: 'write', label: '写作与组件选型' },
  { value: 'check', label: '静态检查与构建' },
  { value: 'smoke', label: '浏览器冒烟' },
]
const publishStep = ref('write')
</script>

# LearningSteps · 分步流程演示

**何时用**：内容有严格先后顺序——命令序列、流水线阶段、排查步骤。每一步一段插槽讲解，读者按节奏推进或回退。

**演示**：

<ClientOnly>
  <LearningSteps id="demo-publish-steps" v-model="publishStep" label="互动教程发布流程" :steps="publishSteps">
    <template #write><p>按主题拆分章节，每个交互回答一个教学问题。</p></template>
    <template #check><p>运行 <code>verify-article.mjs --changed</code> 与 <code>docs:build</code>，修掉 FAIL 再往下走。</p></template>
    <template #smoke><p>运行 <code>verify-site.mjs --serve &lt;专题&gt;</code>，浏览器自动检查交互、键盘与窄屏。</p></template>
  </LearningSteps>
</ClientOnly>

**接口**：

| 属性 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 页内唯一 |
| label | string | 是 | 流程组的可读名称 |
| steps | `{ value, label }[]` | 是 | 至少两步；每个 value 对应同名插槽 |
| v-model | string | 是 | 当前步的 value；步点、前后按钮都会更新它 |

**调用**：

```vue
<LearningSteps id="my-steps" v-model="step" label="发布流程" :steps="steps">
  <template #write><p>……</p></template>
  <template #check><p>……</p></template>
</LearningSteps>
```

**边界**：当前步标记 `aria-current="step"`，上/下一步按钮在首尾自动禁用；步骤之间必须有真实顺序关系，否则用 [Tabs](./tabs)。
