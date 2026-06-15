export default defineNuxtPlugin({
  name: 'auth-init',
  dependsOn: ['supabase-client'],
  async setup() {
    const auth = useAuthStore()
    await auth.initialize()
    auth.bindAuthListener()
  }
})
