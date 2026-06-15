import { z } from 'zod'
import { requireProfile } from '../../utils/auth'
import { updateExhibitionEntry } from '../../utils/repository'

const schema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  cover_image_url: z.string().nullable().optional(),
  artwork_ids: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published']).optional()
})

export default defineEventHandler(async (event) => {
  const viewer = await requireProfile(event)
  const body = schema.parse(await readBody(event))
  return await updateExhibitionEntry(getRouterParam(event, 'id')!, body, viewer)
})
