<script setup lang="ts">
import { ref } from 'vue'
import BlogHeader from '../components/BlogHeader.vue'

interface Article {
  title: string
  summary: string
  content: string
  author: string
  tags: string[]
}

const article = ref<Article>({
  title: '',
  summary: '',
  content: '',
  author: '',
  tags: []
})

const currentTag = ref('')
const isSubmitting = ref(false)

const addTag = () => {
  if (currentTag.value.trim() && !article.value.tags.includes(currentTag.value.trim())) {
    article.value.tags.push(currentTag.value.trim())
    currentTag.value = ''
  }
}

const removeTag = (index: number) => {
  article.value.tags.splice(index, 1)
}

const handleSubmit = async () => {
  if (!article.value.title.trim() || !article.value.content.trim()) {
    alert('请填写标题和内容')
    return
  }

  isSubmitting.value = true
  
  try {
    // 模拟提交延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('提交文章:', article.value)
    alert('文章提交成功！(模拟)')
    
    // 重置表单
    article.value = {
      title: '',
      summary: '',
      content: '',
      author: '',
      tags: []
    }
  } catch (error) {
    console.error('提交失败:', error)
    alert('提交失败，请重试')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="add-article-page">
    <BlogHeader />
    
    <main class="add-article-main">
      <div class="page-header">
        <h1>发布新文章</h1>
        <p>分享你的知识和经验</p>
      </div>
      
      <form @submit.prevent="handleSubmit" class="article-form">
        <div class="form-group">
          <label for="title">文章标题 *</label>
          <input
            id="title"
            v-model="article.title"
            type="text"
            placeholder="请输入文章标题"
            required
            class="form-input"
          >
        </div>
        
        <div class="form-group">
          <label for="summary">文章摘要</label>
          <textarea
            id="summary"
            v-model="article.summary"
            placeholder="请输入文章摘要（可选）"
            rows="3"
            class="form-textarea"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label for="content">文章内容 *</label>
          <textarea
            id="content"
            v-model="article.content"
            placeholder="请输入文章内容..."
            rows="10"
            required
            class="form-textarea"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label for="author">作者</label>
          <input
            id="author"
            v-model="article.author"
            type="text"
            placeholder="请输入作者名称（可选）"
            class="form-input"
          >
        </div>
        
        <div class="form-group">
          <label>标签</label>
          <div class="tags-input-container">
            <input
              v-model="currentTag"
              type="text"
              placeholder="输入标签后按回车添加"
              @keydown.enter.prevent="addTag"
              class="tag-input"
            >
            <button type="button" @click="addTag" class="tag-add-button">添加</button>
          </div>
          <div class="tags-list">
            <span
              v-for="(tag, index) in article.tags"
              :key="index"
              class="tag"
            >
              {{ tag }}
              <button
                type="button"
                @click="removeTag(index)"
                class="tag-remove"
              >
                ×
              </button>
            </span>
          </div>
        </div>
        
        <div class="form-actions">
          <router-link to="/blog" class="cancel-button">取消</router-link>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="submit-button"
          >
            {{ isSubmitting ? '发布中...' : '发布文章' }}
          </button>
        </div>
      </form>
    </main>
  </div>
</template>

<style scoped>
.add-article-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.add-article-main {
  max-width: 800px;
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

.article-form {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #2c3e50;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #667eea;
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
}

.tags-input-container {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.tag-input {
  flex: 1;
}

.tag-add-button {
  padding: 0.75rem 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.tag-add-button:hover {
  background: #5a67d8;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  background: #e8f4fd;
  color: #1890ff;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.9rem;
}

.tag-remove {
  margin-left: 0.5rem;
  background: none;
  border: none;
  color: #1890ff;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  padding: 0;
}

.tag-remove:hover {
  color: #e53e3e;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #ecf0f1;
}

.cancel-button {
  padding: 0.75rem 1.5rem;
  background: #f8f9fa;
  color: #6c757d;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.3s ease;
}

.cancel-button:hover {
  background: #e9ecef;
}

.submit-button {
  padding: 0.75rem 2rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.submit-button:hover:not(:disabled) {
  background: #5a67d8;
}

.submit-button:disabled {
  background: #a0aec0;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .add-article-main {
    padding: 1rem;
  }
  
  .page-header {
    padding: 1.5rem;
  }
  
  .article-form {
    padding: 1.5rem;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .cancel-button,
  .submit-button {
    width: 100%;
    text-align: center;
  }
}
</style>