import type { AuthPayload, Profile } from '~/shared/types'

interface AuthState {
  profile: Profile | null
  accessToken: string | null
  initialized: boolean
}

const DEMO_STORAGE_KEY = 'ai-artstyle-lab-demo-profile'

function normalizeLoginEmail(value: string) {
  const account = value.trim()
  if (account.includes('@')) {
    return account
  }

  const safeAccount = account.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')
  return `legacy-${safeAccount}@artstyle-lab.local`
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    profile: null,
    accessToken: null,
    initialized: false
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.profile),
    role: (state) => state.profile?.role ?? null
  },
  actions: {
    async initialize() {
      if (this.initialized) {
        return
      }

      const { isDemoMode } = useRuntimeMode()

      if (import.meta.client && isDemoMode.value) {
        const cached = localStorage.getItem(DEMO_STORAGE_KEY)
        this.profile = cached ? JSON.parse(cached) as Profile : null
        this.accessToken = this.profile ? `demo-${this.profile.id}` : null
        this.initialized = true
        return
      }

      const supabase = useSupabaseBrowserClient()
      if (!supabase) {
        this.initialized = true
        return
      }

      const { data } = await supabase.auth.getSession()
      const session = data.session

      if (!session) {
        this.initialized = true
        return
      }

      this.accessToken = session.access_token
      await this.refreshProfile()
      this.initialized = true
    },

    async signIn(payload: AuthPayload) {
      const { isDemoMode } = useRuntimeMode()

      if (isDemoMode.value) {
        const demoProfiles = (await import('~/shared/demo-data')).demoProfiles
        const profile = demoProfiles.find((item) => item.email === payload.email) ?? demoProfiles[0]
        this.profile = profile
        this.accessToken = `demo-${profile.id}`
        if (import.meta.client) {
          localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(profile))
        }
        return profile
      }

      const supabase = useSupabaseBrowserClient()
      if (!supabase) {
        throw new Error('Supabase 未配置')
      }

      const email = normalizeLoginEmail(payload.email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: payload.password
      })

      if (error) {
        throw error
      }

      this.accessToken = data.session?.access_token ?? null
      await this.refreshProfile()
      return this.profile
    },

    async signUp(payload: AuthPayload) {
      const { isDemoMode } = useRuntimeMode()

      if (isDemoMode.value) {
        return await this.signIn(payload)
      }

      const supabase = useSupabaseBrowserClient()
      if (!supabase) {
        throw new Error('Supabase 未配置')
      }

      const { data, error } = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            name: payload.name
          }
        }
      })

      if (error) {
        throw error
      }

      this.accessToken = data.session?.access_token ?? null
      await this.refreshProfile()
      return this.profile
    },

    async refreshProfile() {
      if (!this.accessToken) {
        this.profile = null
        return null
      }

      const { request } = useApi()
      try {
        this.profile = await request<Profile>('/api/me')
        return this.profile
      } catch {
        this.profile = null
        return null
      }
    },

    async signOut() {
      const { isDemoMode } = useRuntimeMode()

      if (isDemoMode.value) {
        this.profile = null
        this.accessToken = null
        if (import.meta.client) {
          localStorage.removeItem(DEMO_STORAGE_KEY)
        }
        return
      }

      const supabase = useSupabaseBrowserClient()
      await supabase?.auth.signOut()
      this.profile = null
      this.accessToken = null
    }
  }
})
