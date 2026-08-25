---
title: "前端入门：从零搭建开发环境"
description: "工具链、编辑器、Node 版本管理与第一个 HTML 页面"
category: "前端"
layout: doc
---

# 前端入门：从零搭建开发环境

> 工具链、编辑器、Node 版本管理与第一个 HTML 页面


## 1. 安装 Node.js

建议使用 [nvm-windows](https://github.com/coreybutler/nvm-windows) 或 [fnm](https://github.com/Schniz/fnm) 管理多版本 Node。

```bash
nvm install 20
nvm use 20
node -v
npm -v
```

## 2. 选择编辑器

推荐 VS Code，常用插件：

- ESLint / Prettier
- Volar（Vue 项目）
- GitLens

## 3. 第一个页面

```html
<!doctype html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>Hello</title></head>
<body><h1>Hello Frontend!</h1></body>
</html>
```

## 小结

环境搭建是所有工作的第一步，保持工具链干净整洁能省下很多排查时间。
