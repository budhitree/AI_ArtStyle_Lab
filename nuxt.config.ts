export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],
  css: ['~/app/assets/css/tailwind.css'],
  app: {
    head: {
      title: 'AI ArtStyle Lab',
      meta: [
        {
          name: 'description',
          content: '面向校内师生的 AI 艺术创作、作品管理与主题展览平台。'
        }
      ]
    }
  },
  runtimeConfig: {
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    volcApiKey: process.env.VOLC_API_KEY,
    volcSeedreamEndpoint: process.env.VOLC_SEEDREAM_ENDPOINT,
    volcApiBase: process.env.VOLC_API_BASE || 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'artworks',
    exhibitionBucket: process.env.SUPABASE_EXHIBITION_BUCKET || 'exhibitions',
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || '',
      appName: 'AI ArtStyle Lab'
    }
  },
  routeRules: {
    '/api/**': {
      cors: true
    },
    '/_nuxt/**': {
      headers: { 'cache-control': 'public, max-age=31536000, immutable' }
    },
    '/images/**': {
      headers: { 'cache-control': 'public, max-age=2592000' }
    },
    '/uploads/**': {
      headers: { 'cache-control': 'public, max-age=2592000, immutable' }
    }
  },
  typescript: {
    strict: true,
    typeCheck: false
  },
  tailwindcss: {
    exposeConfig: true,
    config: {
      theme: {
        extend: {
          fontFamily: {
            display: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
            body: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
          },
          colors: {
            canvas: '#f3eee4',
            ink: '#141210',
            ember: '#9a3d27',
            bronze: '#9b7a50',
            mist: '#fbf8f1',
            forest: '#2b4b3f'
          },
          boxShadow: {
            card: '0 24px 80px rgba(20, 18, 16, 0.12)',
            soft: '0 12px 30px rgba(20, 18, 16, 0.08)'
          }
        }
      }
    }
  }
})
