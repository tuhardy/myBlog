---
title: "Redis 数据类型与使用场景"
description: "String / Hash / List / Set / ZSet / Bitmap / HyperLogLog / Stream"
category: "数据库"
layout: doc
---

# Redis 数据类型与使用场景

> String / Hash / List / Set / ZSet / Bitmap / HyperLogLog / Stream


## 一表看完

| 类型 | 典型场景 |
|---|---|
| String | 缓存对象、计数器、分布式锁（SETNX）、Session |
| Hash | 用户信息、对象属性（比 JSON 节省字段更新开销） |
| List | 消息队列、朋友圈时间线、LRU 队列 |
| Set | 共同关注、抽奖、去重 |
| ZSet | 排行榜、延迟队列、带权范围查找 |
| Bitmap | 签到、日活统计 |
| HyperLogLog | UV 统计（只需要近似值） |
| Stream | 轻量消息队列，支持 Consumer Group |

## 分布式锁最简写法

```text
SET lock:order:123 random_value NX EX 30
```

三个关键点：
- `NX`：只有 key 不存在才设置
- `EX 30`：自动过期，防止死锁
- `random_value` + Lua 脚本删除时校验：**只能释放自己加的锁**

## 缓存对象要不要用 JSON

| 方式 | 优点 | 缺点 |
|---|---|---|
| String + JSON | 简单，序列化成熟 | 改一个字段要整串回写 |
| Hash | 字段级更新 | 不支持嵌套对象 |

看更新频率：读多写少选 JSON，字段常改选 Hash。
