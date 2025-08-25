import { defineStore } from 'pinia'
import request from '@/utils/request'

interface User {
  id: string
  username: string
  avatar: string
  email: string
}

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as User | null,
    isLoggedIn: false
  }),
  actions: {
    async login(credentials: { email: string; password: string }) {
      try {
        const res = await request.post('/user/login', credentials)
        this.user = res.data
        this.isLoggedIn = true
        return true
      } catch (error) {
        console.error('登录失败:', error)
        return false
      }
    },
    async logout() {
      await request.post('/user/logout')
      this.user = null
      this.isLoggedIn = false
    },
    async fetchUserInfo() {
      try {
        const res = await request.get('/user/info')
        this.user = res.data
        this.isLoggedIn = true
      } catch (error) {
        console.error('获取用户信息失败:', error)
      }
    }
  },
  persist: true // 持久化存储
})