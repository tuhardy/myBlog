import request from '@/utils/request'

interface Tag {
  id: string
  name: string
  articleCount: number
}

export const getTags = async () => {
  return await request.get<Tag[]>('/tags')
}

export const getArticlesByTag = async (tagId: string) => {
  return await request.get<Article[]>('/articles', {
    params: { tag: tagId }
  })
}