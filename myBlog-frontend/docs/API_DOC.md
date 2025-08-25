# 博客系统API接口文档 (v1.0)

## 基础信息
- 基础路径：`/api`
- 认证方式：JWT (Bearer Token)
- 响应格式：JSON

## 1. 用户认证

### 登录
`POST /user/login`
```json
请求体：
{
  "email": "string, required",
  "password": "string, required"
}

响应：
{
  "code": 200,
  "data": {
    "id": "string",
    "username": "string",
    "avatar": "string (URL)",
    "email": "string",
    "token": "string"
  }
}
```

### 注册
`POST /user/register`
```json
请求体：
{
  "username": "string, required",
  "email": "string, required",
  "password": "string, required",
  "confirmPassword": "string, required"
}
响应：同登录接口
```

## 2. 文章管理

### 获取文章列表
`GET /articles`
```markdown
查询参数：
- page: 页码 (default: 1)
- pageSize: 每页数量 (default: 10)
- category: 分类ID (optional)
- tag: 标签ID (optional)

响应：
{
  "list": [
    {
      "id": "string",
      "title": "string",
      "summary": "string",
      "author": {
        "id": "string",
        "username": "string",
        "avatar": "string"
      },
      "publishTime": "ISO8601",
      "readCount": number,
      "likeCount": number
    }
  ],
  "total": number
}
```

### 获取文章详情
`GET /articles/{id}`
```json
响应：
{
  "id": "string",
  "title": "string",
  "content": "string (Markdown)",
  "author": {
    "id": "string",
    "username": "string",
    "avatar": "string"
  },
  "publishTime": "ISO8601",
  "tags": ["string"],
  "readCount": number,
  "likeCount": number
}
```

### 创建文章
`POST /articles`
```json
请求头：
Authorization: Bearer {token}

请求体：
{
  "title": "string, required",
  "content": "string, required",
  "summary": "string",
  "tags": ["string"]
}
```

## 3. 分类管理

`GET /categories`
```json
响应：
[
  {
    "id": "string",
    "name": "string",
    "articleCount": number
  }
]
```

## 4. 标签管理

`GET /tags`
```json
响应：
[
  {
    "id": "string",
    "name": "string",
    "articleCount": number
  }
]
```

## 5. 收藏网站

`GET /websites`
```json
响应：
[
  {
    "id": "string",
    "name": "string",
    "url": "string",
    "description": "string",
    "category": "string",
    "icon": "string"
  }
]
```

## 6. 错误码

| 状态码 | 说明         |
|--------|------------|
| 200    | 成功        |
| 400    | 参数错误     |
| 401    | 未授权      |
| 403    | 禁止访问     |
| 404    | 资源不存在   |
| 500    | 服务器错误   |

## 7. 数据结构

### 用户(User)
```typescript
interface User {
  id: string
  username: string
  email: string
  avatar: string
  createTime: string
}
```

### 文章(Article)
```typescript
interface Article {
  id: string
  title: string
  content: string
  summary?: string
  author: User
  tags: string[]
  publishTime: string
  updateTime: string
  readCount: number
  likeCount: number
}