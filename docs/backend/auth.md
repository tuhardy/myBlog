---
title: "鉴权、会话与中间件实战"
description: "Session / Cookie、JWT、OAuth 三种常见认证方式对比"
category: "后端"
layout: doc
---

# 鉴权、会话与中间件实战

> Session / Cookie、JWT、OAuth 三种常见认证方式对比


## Session + Cookie（传统方式）

用户登录后，服务端生成一个 sessionId 存 Redis，Set-Cookie 返回给浏览器；
之后浏览器每次请求都会带这个 cookie，服务端查 sessionId 是否有效。

## JWT（无状态）

```js
import jwt from 'jsonwebtoken'
const token = jwt.sign({ uid: 123 }, SECRET, { expiresIn: '7d' })
// 用户每次请求头带: Authorization: Bearer <token>
const payload = jwt.verify(token, SECRET)
```

## OAuth 2.0（第三方登录）

四步走：
1. 用户点「使用 GitHub 登录」跳去 GitHub 授权页
2. GitHub 同意后带回一个 code
3. 后端拿 code 去 GitHub 换 access_token
4. 再拿 token 换 GitHub 用户信息，完成账号绑定

::: tip 选型建议
- 内部系统 / 管理后台 → Session
- 多端（APP + Web）→ JWT
- 需要登录 Facebook / GitHub / Google → OAuth 2.0
:::
