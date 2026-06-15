import { z } from 'zod'
import { requireProfile } from '../../utils/auth'
import { updateArtworkEntry } from '../../utils/repository'

const schema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  prompt: z.string().nullable().optional(),
  visibility: z.enum(['public', 'private']).optional()
})

export default defineEventHandler(async (event) => {
  const viewer = await requireProfile(event)
  const body = schema.parse(await readBody(event))
  return await updateArtworkEntry(getRouterParam(event, 'id')!, body, viewer)
})
