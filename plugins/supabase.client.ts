import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export default defineNuxtPlugin({
  name: 'supabase-client',
  setup() {
    const config = useRuntimeConfig()

    let client: SupabaseClient | null = null

    if (config.public.supabaseUrl && config.public.supabaseAnonKey) {
      client = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      })
    }

    return {
      provide: {
        supabase: client
      }
    }
  }
})
