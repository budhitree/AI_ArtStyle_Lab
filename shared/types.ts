export type UserRole = 'student' | 'teacher' | 'admin'
export type ArtworkVisibility = 'public' | 'private'
export type ArtworkSourceType = 'upload' | 'ai'
export type ExhibitionStatus = 'draft' | 'published'

export interface Profile {
  id: string
  email: string
  account_code: string
  name: string
  role: UserRole
  avatar_url: string | null
  created_at: string
}

export interface Artwork {
  id: string
  title: string
  description: string
  prompt: string | null
  image_url: string
  thumbnail_url: string | null
  owner_id: string
  owner_name: string
  source_type: ArtworkSourceType
  visibility: ArtworkVisibility
  created_at: string
  updated_at: string
}

export interface Exhibition {
  id: string
  title: string
  description: string
  cover_image_url: string | null
  status: ExhibitionStatus
  curator_id: string
  curator_name: string
  created_at: string
  updated_at: string
  artwork_ids: string[]
}

export interface AuthPayload {
  account_code: string
  password: string
  name?: string
  role?: UserRole
}

export interface AiGeneratePayload {
  subject: string
  background: string
  style: string
  details: string
  ratio: '1:1' | '16:9' | '9:16'
}

export interface AiResult {
  id: string
  url: string
  prompt: string
}

export interface AppBootstrap {
  mode: 'demo' | 'supabase'
  artworks: Artwork[]
  exhibitions: Exhibition[]
  me: Profile | null
}
