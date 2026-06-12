import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Artwork, Exhibition, Profile } from '~/shared/types'

interface LocalState {
  profiles: Profile[]
  artworks: Artwork[]
  exhibitions: Exhibition[]
}

let cachedState: LocalState | null | undefined

function legacyDbCandidates() {
  const roots = [...new Set([
    process.env.INIT_CWD,
    process.cwd(),
    resolve(process.cwd(), '..')
  ].filter(Boolean) as string[])]

  return roots.flatMap((root) => [
    resolve(root, 'server/data/artstyle.db'),
    resolve(root, 'legacy/vite-express-demo/server/data/artstyle.db'),
    resolve(root, 'legacy/vite-express-demo/data-source/data/artstyle.db')
  ])
}

function projectRoots() {
  return [...new Set([
    process.env.INIT_CWD,
    process.cwd(),
    resolve(process.cwd(), '..')
  ].filter(Boolean) as string[])]
}

function thumbnailForImage(image: string) {
  if (!image.startsWith('/uploads/')) {
    return image
  }

  const filename = image.split('/').pop()
  if (!filename) {
    return image
  }

  const thumbnail = `/uploads/thumbnails/${filename.replace(/\.[^.]+$/, '')}-thumb.webp`
  const exists = projectRoots().some((root) => existsSync(resolve(root, 'public', thumbnail.replace(/^\//, ''))))
  return exists ? thumbnail : image
}

function normalizeRole(role?: string): Profile['role'] {
  return role === 'teacher' || role === 'admin' ? role : 'student'
}

function normalizeVisibility(value: unknown): Artwork['visibility'] {
  return value === 0 || value === false ? 'private' : 'public'
}

function normalizeSourceType(value: unknown): Artwork['source_type'] {
  return value === 1 || value === true ? 'ai' : 'upload'
}

function toIsoDate(value?: string | null) {
  const parsed = value ? new Date(value) : new Date()
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

export function useLegacyState(): LocalState | null {
  if (cachedState !== undefined) {
    return cachedState
  }

  const dbPath = legacyDbCandidates().find((item) => existsSync(item))
  if (!dbPath) {
    cachedState = null
    return cachedState
  }

  const db = new Database(dbPath, { readonly: true })
  const users = db.prepare('select * from users').all() as Array<Record<string, unknown>>
  const artworks = db.prepare('select * from artworks').all() as Array<Record<string, unknown>>
  const exhibitions = db.prepare('select * from exhibitions').all() as Array<Record<string, unknown>>
  const exhibitionArtworks = db.prepare('select * from exhibition_artworks').all() as Array<Record<string, unknown>>
  db.close()

  const profiles: Profile[] = users.map((user) => {
    const id = String(user.id)
    return {
      id,
      email: id.includes('@') ? id : `${id}@legacy.artstyle.local`,
      name: String(user.name || id),
      role: normalizeRole(String(user.userType || 'student')),
      avatar_url: (user.avatar as string | null) || null,
      created_at: toIsoDate(user.joined as string | null)
    }
  })

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))

  const convertedArtworks: Artwork[] = artworks.map((artwork) => {
    const ownerId = String(artwork.artistId || artwork.artist || 'legacy-owner')
    const createdAt = toIsoDate(artwork.uploadedAt as string | null)
    return {
      id: String(artwork.id),
      title: String(artwork.title || 'Untitled artwork'),
      description: String(artwork.desc || ''),
      prompt: (artwork.prompt as string | null) || null,
      image_url: String(artwork.image || '/images/hero.png'),
      thumbnail_url: thumbnailForImage(String(artwork.image || '/images/hero.png')),
      owner_id: ownerId,
      owner_name: profileMap.get(ownerId)?.name || String(artwork.artist || 'Unknown'),
      source_type: normalizeSourceType(artwork.isAIGenerated),
      visibility: normalizeVisibility(artwork.inShowcase),
      created_at: createdAt,
      updated_at: createdAt
    }
  })

  const convertedExhibitions: Exhibition[] = exhibitions.map((exhibition) => {
    const curatorId = String(exhibition.curatorId || 'legacy-curator')
    const createdAt = toIsoDate(exhibition.createdAt as string | null)
    const status = exhibition.status === 'active' ? 'published' : 'draft'
    return {
      id: String(exhibition.id),
      title: String(exhibition.title || 'Untitled exhibition'),
      description: String(exhibition.description || ''),
      cover_image_url: (exhibition.coverImage as string | null) || null,
      status,
      curator_id: curatorId,
      curator_name: profileMap.get(curatorId)?.name || String(exhibition.curator || 'Unknown'),
      created_at: createdAt,
      updated_at: toIsoDate((exhibition.updatedAt || exhibition.createdAt) as string | null),
      artwork_ids: exhibitionArtworks
        .filter((item) => item.exhibitionId === exhibition.id)
        .map((item) => String(item.artworkId))
    }
  })

  cachedState = {
    profiles,
    artworks: convertedArtworks,
    exhibitions: convertedExhibitions
  }
  return cachedState
}
