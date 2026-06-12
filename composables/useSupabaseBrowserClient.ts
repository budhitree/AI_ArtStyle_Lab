import type { SupabaseClient } from '@supabase/supabase-js'

export const useSupabaseBrowserClient = () => {
  const { $supabase } = useNuxtApp()
  return $supabase as SupabaseClient | null
}
