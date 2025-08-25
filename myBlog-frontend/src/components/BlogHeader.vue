<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const isMenuOpen = ref(false)
const searchQuery = ref('')

const userAvatar = computed(() => {
  if (!userStore.isLoggedIn || !userStore.user) {
    return new URL('@/assets/黑客.png', import.meta.url).href
  }
  // 处理相对路径和绝对路径
  return userStore.user.avatar.startsWith('http') 
    ? userStore.user.avatar
    : `/api${userStore.user.avatar}`
})

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    console.log('搜索:', searchQuery.value)
  }
}
</script>

<template>
  <header class="blog-header">
    <div class="header-container">
      <div class="header-left">
        <h1 class="blog-title">我的博客</h1>
        <nav class="nav-desktop">
          <router-link to="/blog" class="nav-link">首页</router-link>
          <router-link to="/category/1" class="nav-link">分类</router-link>
          <router-link to="/tag/1" class="nav-link">标签</router-link>
          <router-link to="/about" class="nav-link">关于</router-link>
        </nav>
      </div>

      <div class="header-right">
        <router-link to="/add-article" class="write-button">
          <svg class="write-icon" viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
          写文章
        </router-link>
        
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索文章..."
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button @click="handleSearch" class="search-button">
            <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </button>
        </div>

        <router-link to="/login" class="user-avatar">
          <img :src="userAvatar" alt="用户头像" />
        </router-link>

        <button class="menu-toggle" @click="toggleMenu">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 移动端菜单 -->
    <div v-if="isMenuOpen" class="mobile-menu">
      <nav class="nav-mobile">
        <router-link to="/blog" class="nav-link" @click="toggleMenu">首页</router-link>
        <router-link to="/category/1" class="nav-link" @click="toggleMenu">分类</router-link>
        <router-link to="/tag/1" class="nav-link" @click="toggleMenu">标签</router-link>
        <router-link to="/about" class="nav-link" @click="toggleMenu">关于</router-link>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.blog-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.header-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.blog-title {
  font-size: 1.8rem;
  font-weight: bold;
  margin: 0;
  color: white;
}

.nav-desktop {
  display: flex;
  gap: 1.5rem;
}

.nav-link {
  color: white;
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: background-color 0.3s ease;
}

.nav-link:hover,
.nav-link.router-link-active {
  background-color: rgba(255, 255, 255, 0.1);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.write-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 25px;
  backdrop-filter: blur(10px);
  transition: background-color 0.3s ease;
}

.write-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.write-icon {
  color: white;
}

.search-box {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 25px;
  padding: 0.5rem;
  backdrop-filter: blur(10px);
}

.search-input {
  background: none;
  border: none;
  color: white;
  padding: 0.5rem 1rem;
  outline: none;
  width: 200px;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.search-button {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition: background-color 0.3s ease;
}

.search-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255,255,255,0.2);
  transition: border-color 0.3s ease;
}

.user-avatar:hover {
  border-color: rgba(255,255,255,0.5);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.menu-toggle {
  display: none;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.5rem;
}

.mobile-menu {
  display: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem 20px;
}

.nav-mobile {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .nav-desktop {
    display: none;
  }
  
  .menu-toggle {
    display: block;
  }
  
  .mobile-menu {
    display: block;
  }
  
  .search-input {
    width: 150px;
  }
  
  .header-container {
    padding: 0 15px;
  }
}

@media (max-width: 480px) {
  .search-box {
    display: none;
  }
  
  .blog-title {
    font-size: 1.5rem;
  }
}
</style>