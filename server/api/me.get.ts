import { requireProfile } from '../utils/auth'

export default defineEventHandler(async (event) => {
  return await requireProfile(event)
})
