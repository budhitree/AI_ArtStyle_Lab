import { z } from 'zod'
import { generateAiImages } from '../../utils/ai'
import { requireProfile } from '../../utils/auth'

const schema = z.object({
  subject: z.string().min(1),
  background: z.string().default(''),
  style: z.string().default(''),
  details: z.string().default(''),
  ratio: z.enum(['1:1', '16:9', '9:16']).default('1:1')
})

export default defineEventHandler(async (event) => {
  await requireProfile(event)
  const payload = schema.parse(await readBody(event))
  return await generateAiImages(payload)
})
