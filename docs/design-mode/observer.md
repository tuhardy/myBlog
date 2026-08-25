---
title: "观察者模式：事件驱动的核心思想"
description: "发布订阅到底是不是观察者？手写一个最小版 EventEmitter"
category: "设计模式"
layout: doc
---

# 观察者模式：事件驱动的核心思想

> 发布订阅到底是不是观察者？手写一个最小版 EventEmitter


## 角色

- **Subject（被观察者）**：维护一组观察者，有变动就通知它们
- **Observer（观察者）**：实现 update 方法，接收通知

## 和「发布-订阅」的区别

常被搞混。核心区别：

- **观察者模式**：Subject 直接持有 Observer 列表，耦合紧密
- **发布-订阅**：中间多了一个 Event Channel，发布者和订阅者互不认识

Node 的 EventEmitter 属于发布-订阅。

## 手写 20 行 EventEmitter

```js
class Emitter {
  map = new Map()
  on(e, fn) {
    if (!this.map.has(e)) this.map.set(e, [])
    this.map.get(e).push(fn)
  }
  off(e, fn) {
    this.map.set(e, this.map.get(e)?.filter(f => f !== fn) ?? [])
  }
  emit(e, ...args) {
    this.map.get(e)?.forEach(f => f(...args))
  }
}
```

## 实际应用

- Vue2 的 `$on / $emit`、Vue3 的 `mitt` 库
- 前端的 DOM 事件监听 `addEventListener`
- Node.js 中几乎所有核心模块（Stream / HTTP / ChildProcess）
