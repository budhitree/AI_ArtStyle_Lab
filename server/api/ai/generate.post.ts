import { z } from 'zod'
import { generateAiImages } from '../../utils/ai'
import { requireProfile } from '../../utils/auth'
import { createAiGenerationEntry } from '../../utils/repository'

const schema = z.object({
  subject: z.string().min(1),
  background: z.string().default(''),
  style: z.string().default(''),
  details: z.string().default(''),
  ratio: z.enum(['1:1', '16:9', '9:16']).default('1:1')
})

export default defineEventHandler(async (event) => {
  const viewer = await requireProfile(event)
  const payload = schema.parse(await readBody(event))
  const results = await generateAiImages(payload)
  if (results.length) {
    await createAiGenerationEntry({
      prompt: results[0]?.prompt || [payload.subject, payload.background, payload.style, payload.details].filter(Boolean).join('，'),
      params: payload,
      resultImages: results
    }, viewer)
  }
  return results
})
