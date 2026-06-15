export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()
  if (!auth.initialized) {
    await auth.initialize()
  }

  if (!auth.isAuthenticated) {
    return navigateTo('/auth')
  }

  if (!['teacher', 'admin'].includes(auth.role ?? '')) {
    return navigateTo('/')
  }
})
