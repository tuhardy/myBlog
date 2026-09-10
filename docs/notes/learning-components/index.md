---
title: Learning 组件总览
date: 2026-09-11
tags: [VitePress, Vue, 组件库]
description: 本站互动教程共用的 Learning 系列组件选型总览与写作约定；每个组件有独立参考页。
---

# Learning 组件总览

写互动教程时的第一性问题不是"有哪些组件"，而是"这段内容配什么交互"。本目录按组件给出用途、实物演示、接口表、调用代码与适用边界——既是选型参考，也是组件的活文档。

> **环境与约定**：全部组件位于 `config/.vitepress/theme/components/learning`，只依赖项目内 Vue，无第三方 UI 库；支持 SSR 与暗色模式，动画遵循减少动态效果设置。每页交互 ≥2 处即可，至少一处走完整「操作 → 观察 → 原理」链路，不为凑数堆砌。

## 选型表

| 组件 | 教学用途 | 交互输入 | 状态归属 | 文档 |
| --- | --- | --- | --- | --- |
| LearningTabs | 方案或阶段对比 | 点击 / 键盘切换 | 字符串 v-model | [tabs](./tabs) |
| LearningSlider | 调整实验参数 | 拖动 / 方向键 | 数值 v-model | [slider](./slider) |
| LearningCounter | 展示数量变化 | 无（纯展示） | props 传入 | [counter](./counter) |
| LearningSteps | 分步流程演示 | 步点 / 前后按钮 | 字符串 v-model | [steps](./steps) |
| LearningFlipCard | 自测问答 | 点击 / 回车翻面 | 组件内部 | [flip-card](./flip-card) |
| LearningQuiz | 单选自测与反馈 | 点选选项 | 组件内部 | [quiz](./quiz) |
| LearningPopover | 行内术语解释 | 点击开关 | 组件内部 | [popover](./popover) |
<!-- components:table-end（new-component.mjs 在此前插入新组件行） -->

v-model 类组件可与 computed 派生共享状态源，产生可观察联动；内部管理类组件（FlipCard / Quiz / Popover）状态不出组件。

## 写作约定

- 选型优先级：内容需要什么交互 → 再选组件；页内自定义演示（script setup 内联实现）与共享组件平级。
- 新增共享组件的标准：同一交互模式在两篇以上文章中重复出现；运行 `new-component.mjs` 脚手架完成接线。
- 完整规则见 `.devin/skills/vitepress-interactive-writing/SKILL.md`；本目录同时是 `verify-site.mjs` 通用分支的探针验收对象。
