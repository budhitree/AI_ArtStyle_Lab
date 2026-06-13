import type { AuthPayload, Profile } from '~/shared/types'
import {
  authEmailsForAccountCode,
  inferRoleFromAccountCode,
  isRegistrableAccountCode,
  normalizeAccountCode
} from '~/shared/account'

interface AuthState {
  profile: Profile | null
  accessToken: string | null
  initialized: boolean
}

const DEMO_STORAGE_KEY = 'ai-artstyle-lab-demo-profile'

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
        const accountCode = normalizeAccountCode(payload.account_code)
        const profile = demoProfiles.find((item) => item.account_code === accountCode) ?? demoProfiles[0]
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

      let data = null
      let lastError = null

      for (const email of authEmailsForAccountCode(payload.account_code)) {
        const result = await supabase.auth.signInWithPassword({
          email,
          password: payload.password
        })

        if (!result.error) {
          data = result.data
          lastError = null
          break
        }

        lastError = result.error
      }

      if (lastError || !data) {
        throw lastError || new Error('登录失败')
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

      const accountCode = normalizeAccountCode(payload.account_code)
      const role = inferRoleFromAccountCode(accountCode)
      if (!isRegistrableAccountCode(accountCode) || !role) {
        throw new Error('请输入 8 位学号或 7 位工号。')
      }

      await $fetch('/api/auth/register', {
        method: 'POST',
        body: {
          account_code: accountCode,
          password: payload.password,
          name: payload.name
        }
      })

      return await this.signIn({
        account_code: accountCode,
        password: payload.password
      })
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
