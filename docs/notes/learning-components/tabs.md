---
title: LearningTabs · 方案或阶段对比
date: 2026-09-11
tags: [VitePress, 组件库]
description: LearningTabs 组件参考：互斥选项对照的演示、接口与适用边界。
---

<script setup>
import { ref } from 'vue'
import { LearningTabs } from '../../../config/.vitepress/theme/components/learning'

const osOptions = [
  { value: 'windows', label: 'Windows PowerShell' },
  { value: 'linux', label: 'Linux Bash' },
]
const osTab = ref('windows')
</script>

# LearningTabs · 方案或阶段对比

**何时用**：同一内容的多种方案、环境或阶段需要互斥对照时。选项彼此独立，不适合表达先后流程（用 [Steps](./steps)）。

**演示**：

<ClientOnly>
  <LearningTabs id="demo-os-tabs" v-model="osTab" label="同一条打印命令在两个终端中的写法" :options="osOptions">
    <template #windows><p>PowerShell 里双引号同样保留变量展开，但变量前缀是 <code>$</code>。</p></template>
    <template #linux><p>Bash 中双引号展开变量，单引号输出字面量 <code>$dish</code>；引号选择决定是否展开。</p></template>
  </LearningTabs>
</ClientOnly>

**接口**：

| 属性 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 页内唯一，用于无障碍关联 |
| label | string | 是 | 选项卡组的可读名称 |
| options | `{ value, label }[]` | 是 | 每个 value 对应一个同名插槽 |
| v-model | string | 是 | 当前选中项的 value，必须命中某个选项 |

**调用**：

```vue
<LearningTabs id="my-tabs" v-model="tab" label="环境对照" :options="options">
  <template #windows><p>……</p></template>
  <template #linux><p>……</p></template>
</LearningTabs>
```

**边界**：option.value 必须唯一且可用于 HTML id；插槽内代码优先 `pre`/`code` 文本绑定或短纯文本，避免 Markdown 解析歧义。
