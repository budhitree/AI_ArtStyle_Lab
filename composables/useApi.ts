export const useApi = () => {
  const auth = useAuthStore()

  const request = async <T>(url: string, options: Parameters<typeof $fetch<T>>[1] = {}) => {
    const headers = new Headers(options.headers as HeadersInit | undefined)

    if (auth.accessToken) {
      headers.set('Authorization', `Bearer ${auth.accessToken}`)
    }

    return await $fetch<T>(url, {
      ...options,
      headers
    })
  }

  return {
    request
  }
}
