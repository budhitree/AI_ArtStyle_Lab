import { requireProfile } from '../../utils/auth'
import { listAiGenerationEntries } from '../../utils/repository'

function numberQuery(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export default defineEventHandler(async (event) => {
  const viewer = await requireProfile(event)
  const query = getQuery(event)
  return await listAiGenerationEntries(viewer, numberQuery(query.limit, 20))
})
