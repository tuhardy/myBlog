---
title: "工程化实践：Vite + TS + Lint 配置"
description: "零配置起手，配合 ESLint + Prettier 打造一致的团队代码风格"
category: "前端"
layout: doc
---

# 工程化实践：Vite + TS + Lint 配置

> 零配置起手，配合 ESLint + Prettier 打造一致的团队代码风格


## Vite 初始化

```bash
npm create vite@latest my-app -- --template vue-ts
cd my-app && npm install && npm run dev
```

## ESLint + Prettier 分工

- **ESLint**：代码质量（有没有 console.log、未使用变量…）
- **Prettier**：代码格式（缩进、分号、换行…）

不要让两者规则冲突，装 `eslint-config-prettier` 关闭 ESLint 的格式化规则。

## Husky + lint-staged

提交前自动对 `git add` 的文件跑 lint/format，不规范的代码进不了仓库。

```bash
npx husky init
npm i -D lint-staged
```

::: tip 建议
把 `package.json` 中的 `scripts` 规范好：`dev / build / preview / lint / format / type-check`，团队统一入口。
:::
