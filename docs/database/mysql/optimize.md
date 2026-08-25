---
title: "SQL 优化与慢查询排查"
description: "从开启慢日志到 EXPLAIN 再到索引策略的完整流程"
category: "数据库"
layout: doc
---

# SQL 优化与慢查询排查

> 从开启慢日志到 EXPLAIN 再到索引策略的完整流程


## 第一步：开启慢查询日志

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
SET GLOBAL log_queries_not_using_indexes = 'ON';
```

长期用的话写进 `my.cnf`，否则重启失效。

## 第二步：用 pt-query-digest 分析日志

```bash
pt-query-digest slow.log > slow_report.txt
```

一眼就能看到「哪条 SQL 消耗了最多总时间」。

## 第三步：EXPLAIN 关键字段

| 列 | 要看什么 |
|---|---|
| type | 至少 `range`，目标 `ref` / `eq_ref`，看到 `ALL` 基本就要优化 |
| key | 实际走了哪个索引（NULL 说明没走） |
| rows | 预估扫描行数，越小越好 |
| Extra | `Using where` / `Using index` / `Using filesort` / `Using temporary` |

## 常见优化手段

1. **避免 SELECT ***：只取需要的列，有利于覆盖索引
2. **避免在索引列上用函数 / 运算**：`WHERE YEAR(created_at) = 2024` → 索引失效
3. **LIKE 前缀有效**：`LIKE 'abc%'` 可以用索引，`'%abc%'` 全表扫
4. **深分页优化**：`LIMIT 100000, 20` 很慢，改成「先找 ID 再 join」
5. **关联表不要超过 3 张**，join 字段必须建立索引

::: warning 一个反直觉的点
小表（< 1 万行）全表扫未必比索引慢，优化器可能会故意选 `ALL`，
这不一定是问题，重点是「大表 + ALL」要处理。
:::
