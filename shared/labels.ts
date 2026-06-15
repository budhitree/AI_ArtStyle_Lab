import type { ArtworkSourceType, ArtworkVisibility, ExhibitionStatus, UserRole } from './types'

export const roleLabel: Record<UserRole, string> = {
  student: '学生',
  teacher: '教师',
  admin: '管理员'
}

export const visibilityLabel: Record<ArtworkVisibility, string> = {
  public: '公开',
  private: '仅自己可见'
}

export const sourceTypeLabel: Record<ArtworkSourceType, string> = {
  upload: '上传作品',
  ai: 'AI 创作'
}

export const exhibitionStatusLabel: Record<ExhibitionStatus, string> = {
  draft: '草稿',
  published: '已发布'
}
