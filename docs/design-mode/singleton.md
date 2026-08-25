---
title: "单例模式：全局唯一实例的几种实现"
description: "饿汉 / 懒汉 / 双重检查锁 / 枚举，分别解决了什么问题"
category: "设计模式"
layout: doc
---

# 单例模式：全局唯一实例的几种实现

> 饿汉 / 懒汉 / 双重检查锁 / 枚举，分别解决了什么问题


## 定义

保证一个类只有一个实例，并提供一个全局访问点。
典型用途：配置对象、连接池、日志。

## 最简单：饿汉式

```java
public class Singleton {
  private static final Singleton INSTANCE = new Singleton();
  private Singleton() {}
  public static Singleton getInstance() { return INSTANCE; }
}
```

类加载时就初始化，简单可靠。缺点是不用也占内存。

## 线程安全懒汉：双重检查锁

```java
public class Singleton {
  private static volatile Singleton instance;
  private Singleton() {}
  public static Singleton getInstance() {
    if (instance == null) {                   // 第一层
      synchronized (Singleton.class) {
        if (instance == null) {               // 第二层
          instance = new Singleton();
        }
      }
    }
    return instance;
  }
}
```

必须加 `volatile`，否则指令重排会导致其他线程拿到半初始化的对象。

## JavaScript 里的单例

ES Module 本身就是单例的，同一个模块只会被初始化一次。
直接 `export const appConfig = { ... }` 就是单例。
