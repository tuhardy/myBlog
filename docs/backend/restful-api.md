---
title: "RESTful API 设计原则"
description: "资源定位、HTTP 动词语义、状态码约定与版本策略"
category: "后端"
layout: doc
---

# RESTful API 设计原则

> 资源定位、HTTP 动词语义、状态码约定与版本策略


## 核心：一切皆资源

REST 的关键是把业务对象看成「资源」，每个资源用一个 URL 代表：

- `GET /users` 列出用户
- `GET /users/123` 取单个用户
- `POST /users` 创建用户
- `PUT /users/123` 全量更新
- `PATCH /users/123` 部分更新
- `DELETE /users/123` 删除

## 常见状态码速查

| 码 | 含义 | 典型场景 |
|---|---|---|
| 200 | OK | 查询成功 |
| 201 | Created | 新建成功 |
| 204 | No Content | 删除成功，无响应体 |
| 400 | Bad Request | 参数错误 |
| 401 | Unauthorized | 未登录 |
| 403 | Forbidden | 已登录但无权 |
| 404 | Not Found | 资源不存在 |
| 500 | Internal Error | 服务器崩了 |

## 版本策略

推荐两种：
- 路径前缀：`/api/v1/users`
- 请求头：`Accept: application/vnd.myapi.v1+json`

::: warning 常见反模式
不要把动作放进 URL，比如 `/getUserList`、`/deleteUser?id=1` —— 这些都不是 RESTful。
:::
