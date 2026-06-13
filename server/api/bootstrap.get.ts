import { getOptionalProfile } from '../utils/auth'
import { countArtworks, listArtworks, listExhibitions } from '../utils/repository'
import { isSupabaseConfigured } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  const me = await getOptionalProfile(event)
  setHeader(event, 'Cache-Control', 'no-store')

  const [artworks, exhibitions, publicArtworkCount] = await Promise.all([
    listArtworks('public', null, { limit: 24, random: true }),
    listExhibitions('public', me, { limit: 7 }),
    countArtworks('public')
  ])

  return {
    mode: isSupabaseConfigured() ? 'supabase' : 'demo',
    artworks,
    exhibitions,
    publicArtworkCount,
    me
  }
})
