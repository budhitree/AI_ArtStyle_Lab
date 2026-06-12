import { createClient } from '@supabase/supabase-js'

export const isSupabaseConfigured = () => {
  const config = useRuntimeConfig()
  return Boolean(config.public.supabaseUrl && config.public.supabaseAnonKey && config.supabaseServiceRoleKey)
}

export const useSupabaseAdmin = () => {
  const config = useRuntimeConfig()
  if (!isSupabaseConfigured()) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase configuration is missing.'
    })
  }

  return createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}
