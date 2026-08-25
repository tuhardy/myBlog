---
title: "缓存穿透 / 击穿 / 雪崩"
description: "三大问题的成因、区别和解决方案一次性讲清"
category: "数据库"
layout: doc
---

# 缓存穿透 / 击穿 / 雪崩

> 三大问题的成因、区别和解决方案一次性讲清


## 一图分清

| 问题 | 发生了什么 | 结果 |
|---|---|---|
| **穿透** | 查询一个**根本不存在**的 key | 每次都打到数据库（缓存没挡） |
| **击穿** | 一个**热点 key 过期** | 同一时刻并发请求全涌进 DB |
| **雪崩** | **大量 key 同时过期 / Redis 挂了** | 大面积请求直接打 DB |

## 穿透：怎么处理

两种方案，通常组合用：

1. **布隆过滤器**：把所有合法的 id 预塞进布隆过滤器，不存在直接拦掉
2. **缓存空值**：DB 查不到的也缓存一个 `NULL`（短 TTL）

## 击穿：怎么处理

- **互斥锁**：key 失效时，只让第一个请求去查 DB + 回写缓存，其他请求自旋重试
- **热点永不过期**：逻辑过期，用定时任务异步刷新，不依赖 TTL

互斥锁伪代码：

```java
public Object get(String key) {
  Object v = redis.get(key);
  if (v != null) return v;
  if (redis.setnx("lock:" + key, 1, 30s)) {
    v = db.query(key);
    redis.setex(key, TTL, v);
    redis.del("lock:" + key);
    return v;
  } else {
    sleep(50); return get(key);
  }
}
```

## 雪崩：怎么处理

- **TTL 加随机值**：`expire(3600 + rand(0, 600))` 避免同秒失效
- **多级缓存**：本地 Caffeine + Redis，Redis 挂了还有本地
- **熔断降级**：Hystrix / Sentinel，DB 压力过大时直接返回兜底页
- **Redis 高可用**：哨兵 / 集群，别单点

::: tip 面试答题小技巧
回答时按「成因 → 后果 → 对应 2~3 个解法」的结构说，说完补一句「实际项目里我们一般组合使用」，分就高了。
:::
