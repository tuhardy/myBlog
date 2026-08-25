---
title: "工厂模式：解耦对象创建与使用"
description: "简单工厂 / 工厂方法 / 抽象工厂，到底该用哪一层"
category: "设计模式"
layout: doc
---

# 工厂模式：解耦对象创建与使用

> 简单工厂 / 工厂方法 / 抽象工厂，到底该用哪一层


## 问题

业务代码里到处 `new Xxx()`，以后要换实现类就要改一堆地方。

## 简单工厂（一个工厂造所有产品）

```js
function createButton(type) {
  if (type === 'primary') return new PrimaryButton()
  if (type === 'danger')  return new DangerButton()
  throw new Error('unknown button type')
}
```

## 工厂方法（一类产品对应一个工厂）

每个产品都有自己的工厂类，新增产品时只加一个工厂，
不改动现有代码（符合开闭原则）。

## 抽象工厂（造一族产品）

比如同时造「按钮 + 输入框」的整套 Win10 风格 / Mac 风格组件，
当产品族固定但族的变体多的时候用。

## 选型表

| 模式 | 适用场景 |
|---|---|
| 简单工厂 | 产品少、几乎不扩展 |
| 工厂方法 | 产品常新增 |
| 抽象工厂 | 有多套产品族需要切换 |
