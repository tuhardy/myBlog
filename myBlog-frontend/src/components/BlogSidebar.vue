<script setup lang="ts">
interface Category {
  id: number
  name: string
  count: number
}

interface Tag {
  id: number
  name: string
  count: number
}

interface Props {
  categories: Category[]
  tags: Tag[]
}

defineProps<Props>()

const recentPosts = [
  { id: 1, title: 'Vue 3 新特性全面解析', date: '2024-01-15' },
  { id: 2, title: 'TypeScript 最佳实践', date: '2024-01-10' },
  { id: 3, title: 'Spring Boot 后端开发指南', date: '2024-01-08' },
  { id: 4, title: 'React Hooks 深度解析', date: '2024-01-05' },
  { id: 5, title: 'Docker 容器化部署', date: '2024-01-02' }
]

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <aside class="sidebar">
    <!-- 关于我 -->
    <div class="sidebar-widget about-widget">
      <h3 class="widget-title">关于我</h3>
      <div class="about-content">
        <div class="avatar">
          <svg viewBox="0 0 24 24" width="60" height="60">
            <path fill="#667eea" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        <p class="about-text">热爱技术的全栈开发者，专注于前端和后端技术分享。</p>
        <div class="social-links">
          <a href="#" class="social-link">Twitter</a>
          <a href="#" class="social-link">LinkedIn</a>
          <a href="#" class="social-link">GitHub</a>
        </div>
      </div>
    </div>

    <!-- 分类 -->
    <div class="sidebar-widget categories-widget">
      <h3 class="widget-title">分类</h3>
      <ul class="categories-list">
        <li v-for="category in categories" :key="category.id" class="category-item">
          <router-link :to="`/category/${category.id}`" class="category-link">
            <span class="category-name">{{ category.name }}</span>
            <span class="category-count">{{ category.count }}</span>
          </router-link>
        </li>
      </ul>
    </div>

    <!-- 标签云 -->
    <div class="sidebar-widget tags-widget">
      <h3 class="widget-title">标签</h3>
      <div class="tags-cloud">
        <router-link
          v-for="tag in tags"
          :key="tag.id"
          :to="`/tag/${tag.id}`"
          class="tag"
        >
          {{ tag.name }}
        </router-link>
      </div>
    </div>

    <!-- 最新文章 -->
    <div class="sidebar-widget recent-posts-widget">
      <h3 class="widget-title">最新文章</h3>
      <ul class="recent-posts-list">
        <li v-for="post in recentPosts" :key="post.id" class="recent-post-item">
          <router-link :to="`/article/${post.id}`" class="recent-post-link">
            <span class="post-title">{{ post.title }}</span>
            <span class="post-date">{{ formatDate(post.date) }}</span>
          </router-link>
        </li>
      </ul>
    </div>

    <!-- 归档 -->
    <div class="sidebar-widget archive-widget">
      <h3 class="widget-title">归档</h3>
      <ul class="archive-list">
        <li class="archive-item">
          <router-link to="/archive/2024/01" class="archive-link">
            <span class="archive-month">2024年1月</span>
            <span class="archive-count">15篇</span>
          </router-link>
        </li>
        <li class="archive-item">
          <router-link to="/archive/2023/12" class="archive-link">
            <span class="archive-month">2023年12月</span>
            <span class="archive-count">12篇</span>
          </router-link>
        </li>
        <li class="archive-item">
          <router-link to="/archive/2023/11" class="archive-link">
            <span class="archive-month">2023年11月</span>
            <span class="archive-count">8篇</span>
          </router-link>
        </li>
      </ul>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.sidebar-widget {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.widget-title {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #667eea;
}

/* 关于我 */
.about-content {
  text-align: center;
}

.avatar {
  margin-bottom: 1rem;
}

.avatar svg {
  border-radius: 50%;
  background: #f8f9fa;
  padding: 0.5rem;
}

.about-text {
  margin: 0 0 1rem 0;
  color: #5a6c7d;
  line-height: 1.5;
}

.social-links {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.social-link {
  color: #667eea;
  padding: 0.5rem;
  border-radius: 50%;
  transition: background-color 0.3s ease;
}

.social-link:hover {
  background-color: #f8f9fa;
}

/* 分类 */
.categories-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.category-item {
  border-bottom: 1px solid #ecf0f1;
}

.category-item:last-child {
  border-bottom: none;
}

.category-link {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  color: #5a6c7d;
  text-decoration: none;
  transition: color 0.3s ease;
}

.category-link:hover {
  color: #667eea;
}

.category-name {
  font-weight: 500;
}

.category-count {
  background: #667eea;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  min-width: 2rem;
  text-align: center;
}

/* 标签云 */
.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: #e8f4fd;
  color: #1890ff;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  text-decoration: none;
  transition: all 0.3s ease;
  display: inline-block;
}

.tag:hover {
  background: #1890ff;
  color: white;
  transform: translateY(-1px);
}

/* 最新文章 */
.recent-posts-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.recent-post-item {
  border-bottom: 1px solid #ecf0f1;
}

.recent-post-item:last-child {
  border-bottom: none;
}

.recent-post-link {
  display: flex;
  flex-direction: column;
  padding: 0.75rem 0;
  color: #5a6c7d;
  text-decoration: none;
  transition: color 0.3s ease;
}

.recent-post-link:hover {
  color: #667eea;
}

.post-title {
  font-weight: 500;
  margin-bottom: 0.25rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-date {
  font-size: 0.8rem;
  color: #95a5a6;
}

/* 归档 */
.archive-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.archive-item {
  border-bottom: 1px solid #ecf0f1;
}

.archive-item:last-child {
  border-bottom: none;
}

.archive-link {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  color: #5a6c7d;
  text-decoration: none;
  transition: color 0.3s ease;
}

.archive-link:hover {
  color: #667eea;
}

.archive-month {
  font-weight: 500;
}

.archive-count {
  background: #667eea;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  min-width: 2rem;
  text-align: center;
}

@media (max-width: 768px) {
  .sidebar-widget {
    padding: 1rem;
  }
  
  .widget-title {
    font-size: 1rem;
  }
  
  .about-text {
    font-size: 0.9rem;
  }
  
  .category-link,
  .recent-post-link,
  .archive-link {
    padding: 0.5rem 0;
  }
  
  .tags-cloud {
    gap: 0.4rem;
  }
  
  .tag {
    padding: 0.3rem 0.6rem;
    font-size: 0.8rem !important;
  }
}
</style>