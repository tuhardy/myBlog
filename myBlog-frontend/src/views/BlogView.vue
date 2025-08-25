<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getArticles } from '@/api/article'
import ArticleList from '@/components/ArticleList.vue'

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

const articles = ref<Article[]>([])
const loading = ref(false)
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const fetchArticles = async () => {
  loading.value = true
  try {
    const res = await getArticles({
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    articles.value = res.list
    pagination.total = res.total
  } catch (error) {
    console.error('获取文章列表失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchArticles()
})
</script>

<template>
  <div class="blog-view">
    <ArticleList :articles="articles" />
    
    <div v-if="loading" class="loading">
      加载中...
    </div>
    
    <div v-if="!loading && articles.length === 0" class="empty">
      暂无文章
    </div>
  </div>
</template>

<style scoped>
.blog-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.loading,
.empty {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .blog-view {
    padding: 1rem;
  }
}
</style>