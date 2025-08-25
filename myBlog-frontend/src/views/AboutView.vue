<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ref, computed } from 'vue'
import BlogHeader from '@/components/BlogHeader.vue'

interface Website {
  id: number
  name: string
  url: string
  description: string
  category: string
  icon: string
}

const websites = ref<Website[]>([
  {
    id: 1,
    name: 'GitHub',
    url: 'https://github.com',
    description: '代码托管平台',
    category: '开发',
    icon: 'carbon:logo-github'
  },
  {
    id: 2,
    name: 'Vue.js',
    url: 'https://vuejs.org',
    description: '渐进式JavaScript框架',
    category: '前端',
    icon: 'carbon:logo-vue'
  },
  {
    id: 3,
    name: 'MDN',
    url: 'https://developer.mozilla.org',
    description: 'Web开发文档',
    category: '文档',
    icon: 'carbon:document'
  },
  {
    id: 4,
    name: 'Stack Overflow',
    url: 'https://stackoverflow.com',
    description: '开发者问答社区',
    category: '社区',
    icon: 'carbon:forum'
  },
  {
    id: 5,
    name: 'CSS Tricks',
    url: 'https://css-tricks.com',
    description: 'CSS技巧和教程',
    category: '前端',
    icon: 'carbon:paint-brush'
  },
  {
    id: 6,
    name: 'Dev.to',
    url: 'https://dev.to',
    description: '开发者社区',
    category: '社区',
    icon: 'carbon:chat'
  },
  {
    id: 7,
    name: 'CodePen',
    url: 'https://codepen.io',
    description: '前端代码示例',
    category: '前端',
    icon: 'carbon:code'
  },
  {
    id: 8,
    name: 'NPM',
    url: 'https://www.npmjs.com',
    description: 'JavaScript包管理',
    category: '开发',
    icon: 'carbon:package'
  }
])

const categories = computed(() => {
  return [...new Set(websites.value.map(w => w.category))]
})
</script>

<template>
  <div class="website-collection">
    <BlogHeader />
    <main class="main-content">
      <h1>收藏王朝</h1>
      <p class="subtitle">精心收藏的优质网站资源</p>

      <div v-for="category in categories" :key="category" class="category-section">
        <h2>{{ category }}</h2>
        <div class="website-grid">
          <div v-for="website in websites.filter(w => w.category === category)" 
              :key="website.id" 
              class="website-card">
            <div class="website-icon">
              <Icon :icon="website.icon" width="24" height="24" />
            </div>
            <div class="website-info">
              <h3>
                <a :href="website.url" target="_blank">{{ website.name }}</a>
              </h3>
              <p class="website-url">{{ website.url }}</p>
              <p class="website-desc">{{ website.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.website-collection {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  flex: 1;
}

h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: var(--color-heading);
}

.subtitle {
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin-bottom: 2rem;
}

.category-section {
  margin-bottom: 2rem;
}

.category-section h2 {
  font-size: 1.5rem;
  color: var(--color-heading);
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.website-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.5rem;
}

.website-card {
  background: var(--color-background-soft);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0; /* 防止内容溢出 */
}

.website-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.website-icon {
  color: var(--color-primary);
  font-size: 1.5rem;
}

.website-info {
  min-width: 0; /* 防止内容溢出 */
}

.website-info h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.website-info h3 a {
  color: var(--color-heading);
  text-decoration: none;
}

.website-info h3 a:hover {
  color: var(--color-primary);
}

.website-url {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0 0 0.5rem 0;
  word-break: break-all;
}

.website-desc {
  font-size: 0.95rem;
  color: var(--color-text);
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 1200px) {
  .website-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .website-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .website-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  
  .main-content {
    padding: 1rem;
  }
}
</style>