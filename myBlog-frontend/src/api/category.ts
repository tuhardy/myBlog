import request from '@/utils/request'

interface Category {
  id: string
  name: string
  articleCount: number
}

export const getCategories = async () => {
  return await request.get<Category[]>('/categories')
}