<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import BlogHeader from '../components/BlogHeader.vue'
import ArticleList from '../components/ArticleList.vue'

const route = useRoute()
const tagId = ref(route.params.id)
const tagName = ref('Vue')

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
    id: 4,
    title: 'Vue Router 4 使用指南',
    summary: '学习Vue Router 4的新特性和最佳实践',
    content: 'Vue Router 4是Vue 3的官方路由库...',
    author: 'Vue开发者',
    publishTime: '2024-01-12',
    tags: ['Vue', '路由', '前端'],
    readCount: 145,
    likeCount: 25
  }
])
</script>

<template>
  <div class="tag-page">
    <BlogHeader />
    
    <main class="tag-main">
      <div class="page-header">
        <h1>标签: #{{ tagName }}</h1>
        <p>共 {{ articles.length }} 篇文章</p>
      </div>
      
      <ArticleList :articles="articles" />
    </main>
  </div>
</template>

<style scoped>
.tag-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.tag-main {
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
  .tag-main {
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