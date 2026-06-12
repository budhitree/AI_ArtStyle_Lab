import { getOptionalProfile } from '../utils/auth'
import { listArtworks, listExhibitions } from '../utils/repository'
import { isSupabaseConfigured } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  const me = await getOptionalProfile(event)

  return {
    mode: isSupabaseConfigured() ? 'supabase' : 'demo',
    artworks: await listArtworks('public', null, { limit: 24 }),
    exhibitions: await listExhibitions('public', me),
    me
  }
})
