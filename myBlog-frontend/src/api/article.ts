import request from '@/utils/request'

interface Article {
  id: string
  title: string
  content: string
  summary: string
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

export const getArticles = async (params?: {
  page?: number
  pageSize?: number
  category?: string
  tag?: string
}) => {
  return await request.get<{
    list: Article[]
    total: number
  }>('/articles', { params })
}

export const getArticle = async (id: string) => {
  return await request.get<Article>(`/articles/${id}`)
}

export const createArticle = async (data: {
  title: string
  content: string
  summary?: string
  tags?: string[]
}) => {
  return await request.post<Article>('/articles', data)
}