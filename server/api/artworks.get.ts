import { getOptionalProfile, requireProfile } from '../utils/auth'
import { listArtworks } from '../utils/repository'
import type { ArtworkSourceType, ArtworkVisibility } from '~/shared/types'

function numberQuery(value: unknown, fallback?: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function stringQuery(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function listQuery(value: unknown) {
  const raw = stringQuery(value)
  return raw ? raw.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 100) : undefined
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const ids = listQuery(query.ids)
  const scope = query.scope === 'mine' ? 'mine' : ids?.length ? 'accessible' : 'public'
  const limit = numberQuery(query.limit, undefined)
  const offset = numberQuery(query.offset, 0)
  const visibility = query.visibility === 'public' || query.visibility === 'private' ? query.visibility as ArtworkVisibility : undefined
  const sourceType = query.source_type === 'ai' || query.source_type === 'upload' ? query.source_type as ArtworkSourceType : undefined

  if (scope === 'mine') {
    const viewer = await requireProfile(event)
    return await listArtworks('mine', viewer, { ids, limit, offset, sourceType, visibility })
  }

  const viewer = await getOptionalProfile(event)
  if (scope === 'public') {
    setHeader(event, 'Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
  }
  return await listArtworks(scope, viewer, { ids, limit, offset, sourceType, visibility })
})
