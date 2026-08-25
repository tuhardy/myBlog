---
title: "Node.js 入门：HTTP 服务器搭建"
description: "从原生 http 模块到 Express，逐步理解 Web 服务的核心"
category: "后端"
layout: doc
---

# Node.js 入门：HTTP 服务器搭建

> 从原生 http 模块到 Express，逐步理解 Web 服务的核心


## 最小 HTTP 服务

```js
import http from 'node:http'

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('Hello Node')
})
server.listen(3000, () => console.log('listening :3000'))
```

## 用 Express 简化

```js
import express from 'express'
const app = express()
app.get('/', (req, res) => res.send('Hello Express'))
app.listen(3000)
```

## 中间件是什么

请求经过一条处理链：日志 → 鉴权 → 路由 → 错误处理，每一环就是一个中间件。

## 小结

理解「请求 → 处理 → 响应」这条流水线上，每一层在做什么，比背 API 重要得多。
