import type { Artwork, Exhibition, Profile } from './types'

const now = new Date('2026-03-29T23:00:00.000Z').toISOString()

export const demoProfiles: Profile[] = [
  {
    id: 'demo-student',
    email: 'student@artstyle.lab',
    account_code: '20250101',
    name: '沈知遥',
    role: 'student',
    avatar_url: null,
    created_at: now
  },
  {
    id: 'demo-teacher',
    email: 'teacher@artstyle.lab',
    account_code: '2506049',
    name: '林策',
    role: 'teacher',
    avatar_url: null,
    created_at: now
  },
  {
    id: 'demo-admin',
    email: 'admin@artstyle.lab',
    account_code: 'admin',
    name: '馆务管理员',
    role: 'admin',
    avatar_url: null,
    created_at: now
  }
]

export const demoArtworks: Artwork[] = [
  {
    id: 'art-hero',
    title: '星海阅览室',
    description: '把图书馆和星际航站楼叠在一起的幻想场景，作为首页主视觉与展览封面素材。',
    prompt: '未来图书馆、星云穹顶、漂浮书架、电影感灯光',
    image_url: '/images/hero.png',
    thumbnail_url: '/images/hero.png',
    owner_id: 'demo-teacher',
    owner_name: '林策',
    source_type: 'ai',
    visibility: 'public',
    created_at: now,
    updated_at: now
  },
  {
    id: 'art-1',
    title: '水面回声',
    description: '学生用柔和色块和镜面倒影构成的半抽象风景。',
    prompt: '柔雾、水面反射、学院派构图、温暖纸张肌理',
    image_url: '/images/art1.png',
    thumbnail_url: '/images/art1.png',
    owner_id: 'demo-student',
    owner_name: '沈知遥',
    source_type: 'upload',
    visibility: 'public',
    created_at: now,
    updated_at: now
  },
  {
    id: 'art-2',
    title: '红色采样',
    description: '围绕“记忆中的城市噪点”展开的视觉实验。',
    prompt: '城市抽样、偏红色调、颗粒感、展厅印刷质感',
    image_url: '/images/art2.png',
    thumbnail_url: '/images/art2.png',
    owner_id: 'demo-student',
    owner_name: '沈知遥',
    source_type: 'ai',
    visibility: 'public',
    created_at: now,
    updated_at: now
  },
  {
    id: 'art-3',
    title: '风向标计划',
    description: '教师策展样稿，用于展示主题展览的视觉统一性。',
    prompt: '装置艺术、深色木纹、方向图形、博物馆照明',
    image_url: '/images/art3.png',
    thumbnail_url: '/images/art3.png',
    owner_id: 'demo-teacher',
    owner_name: '林策',
    source_type: 'upload',
    visibility: 'private',
    created_at: now,
    updated_at: now
  }
]

export const demoExhibitions: Exhibition[] = [
  {
    id: 'ex-night-atrium',
    title: '夜间中庭计划',
    description: '聚焦“静物 + 光”的学生实验作品，把图书馆、展厅和 AI 生成并置展示。',
    cover_image_url: '/images/hero.png',
    status: 'published',
    curator_id: 'demo-teacher',
    curator_name: '林策',
    artwork_ids: ['art-hero', 'art-1', 'art-2'],
    created_at: now,
    updated_at: now
  },
  {
    id: 'ex-working-draft',
    title: '材质叠影',
    description: '正在整理中的策展草稿，默认只对策展人可见。',
    cover_image_url: '/images/art3.png',
    status: 'draft',
    curator_id: 'demo-teacher',
    curator_name: '林策',
    artwork_ids: ['art-3'],
    created_at: now,
    updated_at: now
  }
]
