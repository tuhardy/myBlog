# 后端开发参考指南

## 数据库设计

### 用户表(users)
```sql
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String (hashed),
  avatar: String (URL),
  createdAt: Date,
  updatedAt: Date
}
```

### 文章表(articles)
```sql
{
  _id: ObjectId,
  title: String,
  content: String,
  summary: String,
  authorId: ObjectId,
  tags: [String],
  readCount: Number,
  likeCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

## 接口实现要求

1. 用户认证
- 密码必须加密存储(建议使用bcrypt)
- JWT token有效期设置为7天

2. 文章接口
- 列表接口必须支持分页
- 详情接口返回Markdown格式内容
- 创建接口需要验证用户权限

3. 性能优化
- 高频接口添加缓存
- 列表查询添加索引

## 部署要求

1. 环境变量
```env
MONGO_URI=mongodb://localhost:27017/myblog
JWT_SECRET=your_jwt_secret
PORT=8080
```

2. CORS配置
```java
// 允许前端域名访问
allowedOrigins = ["http://localhost:3000"]
```

## 测试数据

提供初始测试数据脚本：
```javascript
// init-db.js
db.users.insertMany([...])
db.articles.insertMany([...])