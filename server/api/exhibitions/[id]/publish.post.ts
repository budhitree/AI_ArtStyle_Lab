import { requireProfile } from '../../../utils/auth'
import { publishExhibitionEntry } from '../../../utils/repository'

export default defineEventHandler(async (event) => {
  const viewer = await requireProfile(event)
  return await publishExhibitionEntry(getRouterParam(event, 'id')!, viewer)
})
