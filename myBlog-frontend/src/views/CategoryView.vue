<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import BlogHeader from '../components/BlogHeader.vue'
import ArticleList from '../components/ArticleList.vue'

const route = useRoute()
const categoryId = ref(route.params.id)
const categoryName = ref('前端开发')

const articles = ref([
  {
    id: 1,
    title: 'Vue 3 新特性全面解析',
    summary: '本文详细介绍了Vue 3的新特性，包括Composition API、性能优化等',
    content: 'Vue 3带来了许多令人兴奋的新特性...',
    author: '前端开发者',
    publishTime: '2024-01-15',
    tags: ['Vue', '前端', 'JavaScript'],
    readCount: 256,
    likeCount: 32
  },
  {
    id: 2,
    title: 'React Hooks 深度解析',
    summary: '深入理解React Hooks的工作原理和最佳实践',
    content: 'React Hooks是React 16.8引入的新特性...',
    author: 'React开发者',
    publishTime: '2024-01-10',
    tags: ['React', '前端', 'JavaScript'],
    readCount: 189,
    likeCount: 28
  }
])
</script>

<template>
  <div class="category-page">
    <BlogHeader />
    
    <main class="category-main">
      <div class="page-header">
        <h1>分类: {{ categoryName }}</h1>
        <p>共 {{ articles.length }} 篇文章</p>
      </div>
      
      <ArticleList :articles="articles" />
    </main>
  </div>
</template>

<style scoped>
.category-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.category-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.page-header {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.page-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  color: #2c3e50;
}

.page-header p {
  margin: 0;
  color: #7f8c8d;
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .category-main {
    padding: 1rem;
  }
  
  .page-header {
    padding: 1.5rem;
  }
  
  .page-header h1 {
    font-size: 1.5rem;
  }
}
</style>