import { getOptionalProfile } from '../../utils/auth'
import { getExhibitionById } from '../../utils/repository'

export default defineEventHandler(async (event) => {
  const viewer = await getOptionalProfile(event)
  return await getExhibitionById(getRouterParam(event, 'id')!, viewer)
})
