import { requireProfile } from '../../utils/auth'
import { deleteExhibitionEntry } from '../../utils/repository'

export default defineEventHandler(async (event) => {
  const viewer = await requireProfile(event)
  return await deleteExhibitionEntry(getRouterParam(event, 'id')!, viewer)
})
