import { getOptionalProfile, requireProfile } from '../utils/auth'
import { listArtworks } from '../utils/repository'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const scope = query.scope === 'mine' ? 'mine' : 'public'

  if (scope === 'mine') {
    const viewer = await requireProfile(event)
    return await listArtworks('mine', viewer)
  }

  const viewer = await getOptionalProfile(event)
  return await listArtworks('public', viewer)
})
