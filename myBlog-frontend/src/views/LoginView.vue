<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BlogHeader from '@/components/BlogHeader.vue'

const router = useRouter()
const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const errorMessage = ref('')

const handleLogin = () => {
  if (!email.value || !password.value) {
    errorMessage.value = '请输入邮箱和密码'
    return
  }
  
  // 模拟登录成功
  console.log('登录信息:', {
    email: email.value,
    password: password.value,
    rememberMe: rememberMe.value
  })
  router.push('/blog')
}

const goToRegister = () => {
  router.push('/register')
}
</script>

<template>
  <div class="auth-page">
    <BlogHeader />
    <main class="auth-container">
      <div class="auth-card">
        <h1>登录</h1>
        
        <form @submit.prevent="handleLogin" class="auth-form">
          <div class="form-group">
            <label for="email">邮箱</label>
            <input
              v-model="email"
              type="email"
              id="email"
              placeholder="请输入邮箱"
              required
            >
          </div>
          
          <div class="form-group">
            <label for="password">密码</label>
            <input
              v-model="password"
              type="password"
              id="password"
              placeholder="请输入密码"
              required
            >
          </div>
          
          <div class="form-options">
            <label class="remember-me">
              <input type="checkbox" v-model="rememberMe">
              记住我
            </label>
            <a href="#" class="forgot-password">忘记密码?</a>
          </div>
          
          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>
          
          <button type="submit" class="auth-button">登录</button>
        </form>
        
        <div class="auth-footer">
          <p>还没有账号? <a @click="goToRegister">立即注册</a></p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  padding: 2rem;
}

.auth-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 2.5rem;
  width: 100%;
  max-width: 400px;
}

.auth-card h1 {
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
  text-align: center;
  color: #2c3e50;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.95rem;
  color: #5a6c7d;
}

.form-group input {
  padding: 0.8rem 1rem;
  border: 1px solid #e0e3e7;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #5a6c7d;
}

.forgot-password {
  color: #667eea;
  text-decoration: none;
}

.forgot-password:hover {
  text-decoration: underline;
}

.error-message {
  color: #e53e3e;
  font-size: 0.9rem;
  text-align: center;
  margin: 0.5rem 0;
}

.auth-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 1rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s ease;
}

.auth-button:hover {
  opacity: 0.9;
}

.auth-footer {
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.95rem;
  color: #7f8c8d;
}

.auth-footer a {
  color: #667eea;
  text-decoration: none;
  cursor: pointer;
}

.auth-footer a:hover {
  text-decoration: underline;
}

@media (max-width: 480px) {
  .auth-container {
    padding: 1rem;
  }
  
  .auth-card {
    padding: 1.5rem;
  }
}
</style>