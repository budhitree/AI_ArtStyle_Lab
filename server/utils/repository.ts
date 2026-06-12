import type { Artwork, Exhibition, Profile } from '~/shared/types'
import { useDemoState } from './demo-state'
import { isSupabaseConfigured, useSupabaseAdmin } from './supabase'

function sortByDateDescending<T extends { created_at: string }>(items: T[]) {
  return [...items].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
}

function ensureCanEditArtwork(profile: Profile, artwork: Artwork) {
  if (profile.role === 'admin' || artwork.owner_id === profile.id) {
    return
  }

  throw createError({ statusCode: 403, statusMessage: 'No permission to edit this artwork.' })
}

function ensureCanEditExhibition(profile: Profile, exhibition: Exhibition) {
  if (profile.role === 'admin' || exhibition.curator_id === profile.id) {
    return
  }

  throw createError({ statusCode: 403, statusMessage: 'No permission to edit this exhibition.' })
}

async function fetchProfilesMap(ids: string[]) {
  const supabase = useSupabaseAdmin()
  const { data } = await supabase.from('profiles').select('*').in('id', ids)
  return new Map((data || []).map((item: Profile) => [item.id, item]))
}

async function fetchArtworkById(id: string) {
  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase.from('artworks').select('*').eq('id', id).single()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Artwork not found.' })
  }

  const profiles = await fetchProfilesMap([data.owner_id as string])
  return toArtworkRecord(data, profiles.get(data.owner_id as string)?.name || 'Unknown')
}

async function fetchExhibitionArtworkIds(id: string) {
  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('exhibition_artworks')
    .select('artwork_id')
    .eq('exhibition_id', id)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return (data || []).map((link) => link.artwork_id as string)
}

function toArtworkRecord(row: Record<string, unknown>, ownerName = 'Unknown'): Artwork {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || '',
    prompt: (row.prompt as string | null) || null,
    image_url: row.image_url as string,
    thumbnail_url: (row.thumbnail_url as string | null) || (row.image_url as string),
    owner_id: row.owner_id as string,
    owner_name: ownerName,
    source_type: row.source_type as Artwork['source_type'],
    visibility: row.visibility as Artwork['visibility'],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string
  }
}

function toExhibitionRecord(row: Record<string, unknown>, curatorName = 'Unknown', artworkIds: string[] = []): Exhibition {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || '',
    cover_image_url: (row.cover_image_url as string | null) || null,
    status: row.status as Exhibition['status'],
    curator_id: row.curator_id as string,
    curator_name: curatorName,
    artwork_ids: artworkIds,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string
  }
}

interface ListOptions {
  limit?: number
}

export async function listArtworks(scope: 'public' | 'mine', viewer?: Profile | null, options: ListOptions = {}) {
  if (!isSupabaseConfigured()) {
    const state = useDemoState()
    const artworks = scope === 'mine' && viewer
      ? state.artworks.filter((item) => item.owner_id === viewer.id)
      : state.artworks.filter((item) => item.visibility === 'public')
    const sorted = sortByDateDescending(artworks)
    return options.limit ? sorted.slice(0, options.limit) : sorted
  }

  const supabase = useSupabaseAdmin()
  let query = supabase.from('artworks').select('*')
  query = scope === 'mine' && viewer ? query.eq('owner_id', viewer.id) : query.eq('visibility', 'public')
  if (options.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const ownerIds = [...new Set((data || []).map((row) => row.owner_id as string))]
  const profiles = ownerIds.length ? await fetchProfilesMap(ownerIds) : new Map()

  return (data || []).map((row) => toArtworkRecord(row, profiles.get(row.owner_id as string)?.name || 'Unknown'))
}

export async function createArtworkEntry(
  input: Pick<Artwork, 'title' | 'description' | 'prompt' | 'image_url' | 'thumbnail_url' | 'source_type' | 'visibility'>,
  viewer: Profile
) {
  const now = new Date().toISOString()

  if (!isSupabaseConfigured()) {
    const state = useDemoState()
    const artwork: Artwork = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description,
      prompt: input.prompt,
      image_url: input.image_url,
      thumbnail_url: input.thumbnail_url || input.image_url,
      owner_id: viewer.id,
      owner_name: viewer.name,
      source_type: input.source_type,
      visibility: input.visibility,
      created_at: now,
      updated_at: now
    }
    state.artworks.unshift(artwork)
    return artwork
  }

  const supabase = useSupabaseAdmin()
  const payload = {
    title: input.title,
    description: input.description,
    prompt: input.prompt,
    image_url: input.image_url,
    thumbnail_url: input.thumbnail_url || input.image_url,
    owner_id: viewer.id,
    source_type: input.source_type,
    visibility: input.visibility
  }

  const { data, error } = await supabase.from('artworks').insert(payload).select('*').single()
  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: error?.message || 'Failed to create artwork.' })
  }

  return toArtworkRecord(data, viewer.name)
}

export async function updateArtworkEntry(id: string, updates: Partial<Artwork>, viewer: Profile) {
  if (!isSupabaseConfigured()) {
    const state = useDemoState()
    const artwork = state.artworks.find((item) => item.id === id)
    if (!artwork) {
      throw createError({ statusCode: 404, statusMessage: 'Artwork not found.' })
    }
    ensureCanEditArtwork(viewer, artwork)
    Object.assign(artwork, updates, { updated_at: new Date().toISOString() })
    return artwork
  }

  const artwork = await fetchArtworkById(id)
  ensureCanEditArtwork(viewer, artwork)

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('artworks')
    .update({
      title: updates.title,
      description: updates.description,
      prompt: updates.prompt,
      visibility: updates.visibility,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: error?.message || 'Failed to update artwork.' })
  }

  return toArtworkRecord(data, artwork.owner_name)
}

export async function deleteArtworkEntry(id: string, viewer: Profile) {
  if (!isSupabaseConfigured()) {
    const state = useDemoState()
    const artwork = state.artworks.find((item) => item.id === id)
    if (!artwork) {
      throw createError({ statusCode: 404, statusMessage: 'Artwork not found.' })
    }
    ensureCanEditArtwork(viewer, artwork)
    state.artworks = state.artworks.filter((item) => item.id !== id)
    state.exhibitions = state.exhibitions.map((item) => ({
      ...item,
      artwork_ids: item.artwork_ids.filter((artworkId) => artworkId !== id)
    }))
    return { success: true }
  }

  const supabase = useSupabaseAdmin()
  const artwork = await fetchArtworkById(id)
  ensureCanEditArtwork(viewer, artwork)

  const { error } = await supabase.from('artworks').delete().eq('id', id)
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  return { success: true }
}

export async function listExhibitions(scope: 'public' | 'mine', viewer?: Profile | null) {
  if (!isSupabaseConfigured()) {
    const state = useDemoState()
    const exhibitions = scope === 'mine' && viewer
      ? state.exhibitions.filter((item) => item.curator_id === viewer.id || viewer.role === 'admin')
      : state.exhibitions.filter((item) => item.status === 'published')
    return sortByDateDescending(exhibitions)
  }

  const supabase = useSupabaseAdmin()
  let query = supabase.from('exhibitions').select('*')
  query = scope === 'mine' && viewer ? query.eq('curator_id', viewer.id) : query.eq('status', 'published')

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const exhibitionIds = (data || []).map((item) => item.id as string)
  const curatorIds = [...new Set((data || []).map((row) => row.curator_id as string))]
  const profiles = curatorIds.length ? await fetchProfilesMap(curatorIds) : new Map()

  const { data: junctions } = exhibitionIds.length
    ? await supabase.from('exhibition_artworks').select('*').in('exhibition_id', exhibitionIds)
    : { data: [] as Array<{ exhibition_id: string, artwork_id: string }> }

  return (data || []).map((row) =>
    toExhibitionRecord(
      row,
      profiles.get(row.curator_id as string)?.name || 'Unknown',
      (junctions || []).filter((link) => link.exhibition_id === row.id).map((link) => link.artwork_id)
    )
  )
}

export async function getExhibitionById(id: string, viewer?: Profile | null) {
  if (!isSupabaseConfigured()) {
    const state = useDemoState()
    const item = state.exhibitions.find((entry) => entry.id === id)
    if (!item) {
      throw createError({ statusCode: 404, statusMessage: 'Exhibition not found.' })
    }

    if (item.status === 'draft' && (!viewer || (viewer.role !== 'admin' && viewer.id !== item.curator_id))) {
      throw createError({ statusCode: 403, statusMessage: 'Exhibition is not public yet.' })
    }

    return item
  }

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase.from('exhibitions').select('*').eq('id', id).single()
  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Exhibition not found.' })
  }

  const exhibition = toExhibitionRecord(
    data,
    (await fetchProfilesMap([data.curator_id as string])).get(data.curator_id as string)?.name || 'Unknown',
    await fetchExhibitionArtworkIds(id)
  )

  if (exhibition.status === 'draft' && (!viewer || (viewer.role !== 'admin' && viewer.id !== exhibition.curator_id))) {
    throw createError({ statusCode: 403, statusMessage: 'Exhibition is not public yet.' })
  }

  return exhibition
}

export async function createExhibitionEntry(
  input: Pick<Exhibition, 'title' | 'description' | 'cover_image_url' | 'artwork_ids'>,
  viewer: Profile
) {
  if (!['teacher', 'admin'].includes(viewer.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Only teachers or admins can create exhibitions.' })
  }

  const now = new Date().toISOString()

  if (!isSupabaseConfigured()) {
    const state = useDemoState()
    const exhibition: Exhibition = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description,
      cover_image_url: input.cover_image_url,
      status: 'draft',
      curator_id: viewer.id,
      curator_name: viewer.name,
      artwork_ids: input.artwork_ids,
      created_at: now,
      updated_at: now
    }
    state.exhibitions.unshift(exhibition)
    return exhibition
  }

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('exhibitions')
    .insert({
      title: input.title,
      description: input.description,
      cover_image_url: input.cover_image_url,
      status: 'draft',
      curator_id: viewer.id
    })
    .select('*')
    .single()

  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: error?.message || 'Failed to create exhibition.' })
  }

  if (input.artwork_ids.length) {
    await supabase.from('exhibition_artworks').insert(input.artwork_ids.map((artworkId) => ({
      exhibition_id: data.id,
      artwork_id: artworkId
    })))
  }

  return toExhibitionRecord(data, viewer.name, input.artwork_ids)
}

export async function updateExhibitionEntry(id: string, updates: Partial<Exhibition>, viewer: Profile) {
  const exhibition = await getExhibitionById(id, viewer)
  ensureCanEditExhibition(viewer, exhibition)

  if (!isSupabaseConfigured()) {
    const state = useDemoState()
    const target = state.exhibitions.find((item) => item.id === id)!
    Object.assign(target, updates, { updated_at: new Date().toISOString() })
    return target
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }
  if (updates.title !== undefined) {
    payload.title = updates.title
  }
  if (updates.description !== undefined) {
    payload.description = updates.description
  }
  if (updates.cover_image_url !== undefined) {
    payload.cover_image_url = updates.cover_image_url
  }
  if (updates.status !== undefined) {
    payload.status = updates.status
  }

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('exhibitions')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: error?.message || 'Failed to update exhibition.' })
  }

  if (Array.isArray(updates.artwork_ids)) {
    await supabase.from('exhibition_artworks').delete().eq('exhibition_id', id)
    if (updates.artwork_ids.length) {
      await supabase.from('exhibition_artworks').insert(updates.artwork_ids.map((artworkId) => ({
        exhibition_id: id,
        artwork_id: artworkId
      })))
    }
  }

  return toExhibitionRecord(data, exhibition.curator_name, updates.artwork_ids ?? exhibition.artwork_ids)
}

export async function publishExhibitionEntry(id: string, viewer: Profile) {
  return await updateExhibitionEntry(id, { status: 'published' }, viewer)
}

export async function deleteExhibitionEntry(id: string, viewer: Profile) {
  const exhibition = await getExhibitionById(id, viewer)
  ensureCanEditExhibition(viewer, exhibition)

  if (!isSupabaseConfigured()) {
    const state = useDemoState()
    state.exhibitions = state.exhibitions.filter((item) => item.id !== id)
    return { success: true }
  }

  const supabase = useSupabaseAdmin()
  await supabase.from('exhibition_artworks').delete().eq('exhibition_id', id)
  const { error } = await supabase.from('exhibitions').delete().eq('id', id)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  return { success: true }
}
