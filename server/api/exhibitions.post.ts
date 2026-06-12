import { z } from 'zod'
import { requireProfile } from '../utils/auth'
import { createExhibitionEntry } from '../utils/repository'

const schema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  cover_image_url: z.string().nullable().optional(),
  artwork_ids: z.array(z.string()).default([])
})

export default defineEventHandler(async (event) => {
  const viewer = await requireProfile(event)
  const body = schema.parse(await readBody(event))
  return await createExhibitionEntry({
    title: body.title,
    description: body.description,
    cover_image_url: body.cover_image_url || null,
    artwork_ids: body.artwork_ids
  }, viewer)
})
