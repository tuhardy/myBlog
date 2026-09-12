---
title: "MySQL 专题"
date: 2026-09-11
tags: [MySQL, 数据库, 专题]
description: "索引原理、事务、锁、SQL 调优与常见面试考点汇总。"
category: "数据库"
layout: doc
---

# MySQL 专题

> 索引原理、事务、锁、SQL 调优与常见面试考点汇总。

## 目录导览

  * [一条 SQL 的一生：从回车到结果集](./lifecycle.md)
  * [MySQL 索引底层原理](./indexing.md)
  * [事务隔离：MVCC 与锁的分工](./transaction.md)
  * [慢 SQL 排查实战：从告警到验证](./optimize.md)

::: details 阅读建议
先看一条 SQL 的六站流水线建立全貌，
再搞懂索引（B+ 树、回表、覆盖索引、最左前缀），
然后理解事务与锁，最后带着这些知识去看 EXPLAIN 做优化，会顺很多。
:::
