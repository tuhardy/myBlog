<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

interface Article {
  id: number
  title: string
  content: string
  author: string
  publishTime: string
  tags: string[]
  readCount: number
  likeCount: number
}

const route = useRoute()
const article = ref<Article | null>(null)
const loading = ref(true)

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const likeArticle = () => {
  if (article.value) {
    article.value.likeCount++
    console.log(`点赞文章: ${article.value.title}`)
  }
}

// 模拟获取文章详情
onMounted(() => {
  setTimeout(() => {
    article.value = {
      id: Number(route.params.id),
      title: '示例文章标题',
      content: '这里是文章的详细内容...\n\n可以包含多段文字、图片等内容。\n\nMarkdown格式的内容也可以在这里展示。',
      author: '作者名称',
      publishTime: new Date().toISOString(),
      tags: ['技术', 'Vue', '前端'],
      readCount: 100,
      likeCount: 20
    }
    loading.value = false
  }, 500)
})
</script>

<template>
  <div class="article-view">
    <div v-if="loading" class="loading-state">
      <svg class="loading-icon" viewBox="0 0 24 24" width="48" height="48">
        <path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
      </svg>
      <p>加载中...</p>
    </div>

    <div v-else-if="article" class="article-container">
      <h1 class="article-title">{{ article.title }}</h1>
      
      <div class="article-meta">
        <span class="author">作者: {{ article.author }}</span>
        <span class="publish-time">发布于: {{ formatDate(article.publishTime) }}</span>
      </div>

      <div class="article-content">
        <pre>{{ article.content }}</pre>
      </div>

      <div class="article-tags">
        <span
          v-for="tag in article.tags"
          :key="tag"
          class="tag"
        >
          #{{ tag }}
        </span>
      </div>

      <div class="article-footer">
        <div class="article-stats">
          <span class="stat-item">
            <svg class="stat-icon" viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
            {{ article.readCount }} 阅读
          </span>
          <span class="stat-item">
            <svg class="stat-icon" viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/>
            </svg>
            {{ article.likeCount }} 点赞
          </span>
        </div>

        <button
          @click="likeArticle()"
          class="like-button"
          :class="{ 'liked': article.likeCount > 0 }"
        >
          <svg class="like-icon" viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/>
          </svg>
          点赞
        </button>
      </div>
    </div>

    <div v-else class="empty-state">
      <svg class="empty-icon" viewBox="0 0 24 24" width="48" height="48">
        <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 12H9.5v-2h-2v2H6V9h1.5v2.5h2V9H11v6zm2-6h4c.55 0 1 .45 1 1v4c0 .55-.45 1-1 1h-4V9zm1.5 4.5h2v-3h-2v3z"/>
      </svg>
      <p>文章不存在</p>
    </div>
  </div>
</template>

<style scoped>
.article-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #95a5a6;
}

.loading-icon,
.empty-icon {
  margin-bottom: 1rem;
  color: #bdc3c7;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.article-container {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.article-title {
  margin: 0 0 1rem 0;
  font-size: 1.8rem;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.3;
}

.article-meta {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
  color: #7f8c8d;
}

.article-content {
  margin: 2rem 0;
  line-height: 1.8;
  color: #34495e;
}

.article-content pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.tag {
  background: #e8f4fd;
  color: #1890ff;
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 500;
}

.article-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1.5rem;
  border-top: 1px solid #ecf0f1;
}

.article-stats {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #7f8c8d;
}

.stat-icon {
  color: #95a5a6;
}

.like-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #6c757d;
  transition: all 0.3s ease;
}

.like-button:hover {
  background: #e9ecef;
  border-color: #dee2e6;
}

.like-button.liked {
  background: #fff5f5;
  border-color: #fed7d7;
  color: #e53e3e;
}

.like-button.liked .like-icon {
  fill: #e53e3e;
}

.like-icon {
  transition: fill 0.3s ease;
}

@media (max-width: 768px) {
  .article-view {
    padding: 1rem;
  }
  
  .article-container {
    padding: 1.5rem;
  }
  
  .article-title {
    font-size: 1.5rem;
  }
  
  .article-meta {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .article-footer {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .article-stats {
    justify-content: space-around;
  }
  
  .like-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
