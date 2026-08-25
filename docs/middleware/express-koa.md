---
title: "Express / Koa 中间件执行链原理"
description: "洋葱模型 vs 线性模型，next() 和 await next() 到底做了什么"
category: "中间件"
layout: doc
---

# Express / Koa 中间件执行链原理

> 洋葱模型 vs 线性模型，next() 和 await next() 到底做了什么


## Express 的线性执行

Express 中间件按注册顺序依次执行，除非遇到 next(err) 跳到错误处理中间件。

```js
app.use((req, res, next) => {
  console.log('1 进来'); next(); console.log('1 出去')
})
app.use((req, res, next) => {
  console.log('2 进来'); next(); console.log('2 出去')
})
// 输出：1 进来 -> 2 进来 -> 路由处理 -> 2 出去 -> 1 出去
```

## Koa 的洋葱模型

Koa 的中间件必须是 async 函数，`await next()` 是分界线：

```js
app.use(async (ctx, next) => {
  console.log('1 请求前'); await next(); console.log('1 响应后')
})
```

## 一个实用例子：总耗时

```js
app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  ctx.set('X-Response-Time', (Date.now() - start) + 'ms')
})
```

## 总结

Express 基于回调，生态大；Koa 基于 Promise/async，对异步更友好。
掌握执行链是写好中间件的关键。
