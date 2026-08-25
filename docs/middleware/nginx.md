---
title: "Nginx 反向代理与静态资源服务"
description: "用最少的配置完成 HTTPS、静态文件、负载均衡、跨域代理"
category: "中间件"
layout: doc
---

# Nginx 反向代理与静态资源服务

> 用最少的配置完成 HTTPS、静态文件、负载均衡、跨域代理


## 反向代理最小配置

```nginx
server {
  listen 80;
  server_name example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

## 静态资源缓存

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff2?)$ {
  expires 30d;
  add_header Cache-Control "public, immutable";
}
```

## 负载均衡

```nginx
upstream backends {
  server 10.0.0.1:3000 weight=2;
  server 10.0.0.2:3000;
}
server {
  location / { proxy_pass http://backends; }
}
```

::: tip reload 命令
每次改完：`nginx -t` 先检查配置，再 `nginx -s reload` 平滑重载，**不要 restart**，避免线上断连。
:::
