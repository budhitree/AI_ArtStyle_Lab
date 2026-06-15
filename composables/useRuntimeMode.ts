export const useRuntimeMode = () => {
  const config = useRuntimeConfig()
  const isSupabaseConfigured = computed(() => Boolean(config.public.supabaseUrl && config.public.supabaseAnonKey))
  const isDemoMode = computed(() => !isSupabaseConfigured.value)

  return {
    isSupabaseConfigured,
    isDemoMode
  }
}
