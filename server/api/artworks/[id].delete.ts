import { requireProfile } from '../../utils/auth'
import { deleteArtworkEntry } from '../../utils/repository'

export default defineEventHandler(async (event) => {
  const viewer = await requireProfile(event)
  return await deleteArtworkEntry(getRouterParam(event, 'id')!, viewer)
})
