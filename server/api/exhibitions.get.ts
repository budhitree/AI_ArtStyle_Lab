import { getOptionalProfile, requireProfile } from '../utils/auth'
import { listExhibitions } from '../utils/repository'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const scope = query.scope === 'mine' ? 'mine' : 'public'

  if (scope === 'mine') {
    const viewer = await requireProfile(event)
    return await listExhibitions('mine', viewer)
  }

  const viewer = await getOptionalProfile(event)
  return await listExhibitions('public', viewer)
})
