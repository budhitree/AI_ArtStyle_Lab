import type { H3Event } from 'h3'
import { demoProfiles } from '~/shared/demo-data'
import type { Profile } from '~/shared/types'
import { accountCodeFromAuthEmail } from '~/shared/account'
import { isSupabaseConfigured, useSupabaseAdmin } from './supabase'

function extractToken(event: H3Event) {
  const header = getHeader(event, 'authorization')
  if (!header?.startsWith('Bearer ')) {
    return null
  }

  return header.slice('Bearer '.length)
}

export const getOptionalProfile = async (event: H3Event): Promise<Profile | null> => {
  const token = extractToken(event)
  if (!token) {
    return null
  }

  if (token.startsWith('demo-')) {
    const id = token.slice('demo-'.length)
    return demoProfiles.find((item) => item.id === id) ?? null
  }

  if (!isSupabaseConfigured()) {
    return null
  }

  const supabase = useSupabaseAdmin()
  const { data: userData, error: userError } = await supabase.auth.getUser(token)

  if (userError || !userData.user) {
    return null
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userData.user.id)
    .single()

  if (error || !data) {
    return null
  }

  return {
    ...data,
    account_code: data.account_code || accountCodeFromAuthEmail(data.email)
  } satisfies Profile
}

export const requireProfile = async (event: H3Event): Promise<Profile> => {
  const profile = await getOptionalProfile(event)
  if (!profile) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required.'
    })
  }

  return profile
}
