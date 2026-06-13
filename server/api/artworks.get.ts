import { getOptionalProfile, requireProfile } from '../utils/auth'
import { listArtworks } from '../utils/repository'

function numberQuery(value: unknown, fallback?: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const scope = query.scope === 'mine' ? 'mine' : 'public'
  const limit = numberQuery(query.limit, undefined)
  const offset = numberQuery(query.offset, 0)

  if (scope === 'mine') {
    const viewer = await requireProfile(event)
    return await listArtworks('mine', viewer, { limit, offset })
  }

  const viewer = await getOptionalProfile(event)
  setHeader(event, 'Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
  return await listArtworks('public', viewer, { limit, offset })
})
