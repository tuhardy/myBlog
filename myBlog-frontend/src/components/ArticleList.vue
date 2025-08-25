<script setup lang="ts">
import { Icon } from '@iconify/vue'

interface Article {
  id: string
  title: string
  summary: string
  content: string
  author: {
    id: string
    username: string
    avatar: string
  }
  publishTime: string
  tags: string[]
  readCount: number
  likeCount: number
}

interface Props {
  articles: Article[]
}

const props = defineProps<Props>()

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const likeArticle = (articleId: string) => {
  console.log('点赞文章:', articleId)
  // 这里调用点赞API
}
</script>

<template>
  <div class="article-list">
    <div v-for="article in articles" :key="article.id" class="article-card">
      <div class="article-header">
        <h2 class="article-title">
          <router-link :to="`/article/${article.id}`" class="title-link">
            {{ article.title }}
          </router-link>
        </h2>
        <div class="article-meta">
          <div class="author-info">
            <img :src="article.author.avatar" class="author-avatar" alt="作者头像">
            <span class="author-name">{{ article.author.username }}</span>
          </div>
          <span class="publish-time">发布于: {{ formatDate(article.publishTime) }}</span>
        </div>
      </div>

      <div class="article-content">
        <p class="article-summary">{{ article.summary }}</p>
        
        <div class="article-tags">
          <span
            v-for="tag in article.tags"
            :key="tag"
            class="tag"
          >
            #{{ tag }}
          </span>
        </div>
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
          @click="likeArticle(article.id)"
          class="like-button"
        >
          <Icon icon="carbon:thumbs-up" width="18" height="18" />
          点赞
        </button>
      </div>
    </div>

    <div v-if="articles.length === 0" class="empty-state">
      <svg class="empty-icon" viewBox="0 0 24 24" width="48" height="48">
        <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 12H9.5v-2h-2v2H6V9h1.5v2.5h2V9H11v6zm2-6h4c.55 0 1 .45 1 1v4c0 .55-.45 1-1 1h-4V9zm1.5 4.5h2v-3h-2v3z"/>
      </svg>
      <p>暂无文章</p>
    </div>
  </div>
</template>

<style scoped>
.article-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.article-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.article-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.article-header {
  margin-bottom: 1rem;
}

.article-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--color-heading);
}

.title-link {
  color: inherit;
  text-decoration: none;
}

.title-link:hover {
  color: var(--color-primary);
}

.article-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.author-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.author-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.publish-time {
  display: flex;
  align-items: center;
}

.article-content {
  margin-bottom: 1rem;
}

.article-summary {
  margin: 0 0 1rem 0;
  line-height: 1.6;
  color: var(--color-text);
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: var(--color-background-soft);
  color: var(--color-primary);
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 500;
}

.article-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
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
  color: var(--color-text-secondary);
}

.stat-icon {
  color: var(--color-text-secondary);
}

.like-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--color-text);
  transition: all 0.3s ease;
}

.like-button:hover {
  background: var(--color-background);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary);
}

.empty-icon {
  margin-bottom: 1rem;
  color: var(--color-border);
}

@media (max-width: 768px) {
  .article-card {
    padding: 1rem;
  }
  
  .article-title {
    font-size: 1.2rem;
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