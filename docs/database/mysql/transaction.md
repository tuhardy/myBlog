---
title: "事务 ACID 与 MVCC"
description: "原子性、一致性、隔离性、持久性；幻读的 MVCC 解决方案"
category: "数据库"
layout: doc
---

# 事务 ACID 与 MVCC

> 原子性、一致性、隔离性、持久性；幻读的 MVCC 解决方案


## ACID

| 字母 | 单词 | 含义 | 实现手段 |
|---|---|---|---|
| A | Atomicity | 要么全成功要么全失败 | undo log |
| C | Consistency | 前后都满足业务约束 | AID 共同保证 |
| I | Isolation | 并发事务互不干扰 | MVCC + 锁 |
| D | Durability | 提交了就不丢 | redo log |

## 四种隔离级别

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
|---|---|---|---|
| 读未提交 | ✅ 可能 | ✅ 可能 | ✅ 可能 |
| 读已提交（RC） | ❌ 不会 | ✅ 可能 | ✅ 可能 |
| 可重复读（RR，InnoDB 默认） | ❌ 不会 | ❌ 不会 | ⚠️ 大部分不会 |
| 串行化 | ❌ 不会 | ❌ 不会 | ❌ 不会 |

## MVCC（多版本并发控制）

每行数据都有隐藏字段：
- `trx_id`：最后修改它的事务 ID
- `roll_pointer`：指向 undo log 里的上一版本

读的时候根据 ReadView 判断哪个版本对自己可见，这样读写就不冲突了。

## RR 下幻读怎么解决的

- **快照读**（普通 SELECT）：MVCC 保证只看到事务开始时的快照
- **当前读**（SELECT ... FOR UPDATE / INSERT / UPDATE / DELETE）：加 **Next-Key Lock**，锁住范围不让别人插

::: danger 别搞混
「不可重复读」是同一条数据内容前后不一样（UPDATE）。
「幻读」是同一范围查询行数前后不一样（INSERT / DELETE）。
:::
