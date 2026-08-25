---
title: "Vue 基础与组件化思维"
description: "从 Options API 到 Composition API，理解组件、props、事件与生命周期"
category: "前端"
layout: doc
---

# Vue 基础与组件化思维

> 从 Options API 到 Composition API，理解组件、props、事件与生命周期


## 什么是组件化

把一个大页面拆成一个个可复用的、独立的小块（组件），每个组件管自己的模板、逻辑、样式。

## SFC 单文件组件

```vue
<template>
  <button class="btn" @click="count++">{{ count }}</button>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<style scoped>
.btn { padding: 8px 16px; border-radius: 6px; }
</style>
```

## Props 向下传，事件向上抛

- **Props**：父 → 子，子组件用 `defineProps` 声明
- **Emits**：子 → 父，子组件 `defineEmits` 抛出，父用 `@event` 接收
- **Pinia**：跨层级共享状态时用

## 生命周期速记

| 阶段 | Composition API hook |
|---|---|
| 挂载前 / 后 | `onBeforeMount` / `onMounted` |
| 更新前 / 后 | `onBeforeUpdate` / `onUpdated` |
| 卸载前 / 后 | `onBeforeUnmount` / `onUnmounted` |
