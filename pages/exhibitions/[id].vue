<script setup lang="ts">
import type { Artwork, Exhibition } from '~/shared/types'
import { exhibitionStatusLabel } from '~/shared/labels'

const route = useRoute()
const auth = useAuthStore()
const { request } = useApi()

const selectedArtwork = ref<Artwork | null>(null)
const status = ref('')
const exhibition = ref<Exhibition | null>(null)
const availableArtworks = ref<Artwork[]>([])
const curationArtworks = ref<Artwork[]>([])

const canEdit = computed(() =>
  Boolean(
    auth.profile &&
    exhibition.value &&
    (auth.profile.role === 'admin' || auth.profile.id === exhibition.value.curator_id)
  )
)

const load = async () => {
  exhibition.value = await request<Exhibition>(`/api/exhibitions/${route.params.id}`)
  const publicArtworks = await request<Artwork[]>('/api/artworks')
  availableArtworks.value = publicArtworks
  if (auth.isAuthenticated) {
    const myArtworks = await request<Artwork[]>('/api/artworks?scope=mine')
    curationArtworks.value = myArtworks
    const merged = new Map([...publicArtworks, ...myArtworks].map((artwork) => [artwork.id, artwork]))
    availableArtworks.value = [...merged.values()]
  }
}

await callOnce(load)

const exhibitionArtworks = computed(() => {
  if (!exhibition.value) {
    return []
  }
  const ids = new Set(exhibition.value.artwork_ids)
  return availableArtworks.value.filter((item) => ids.has(item.id))
})

const remainingArtworks = computed(() => {
  if (!exhibition.value) {
    return []
  }
  const ids = new Set(exhibition.value.artwork_ids)
  return curationArtworks.value.filter((item) => !ids.has(item.id))
})

const save = async () => {
  if (!exhibition.value) {
    return
  }
  exhibition.value = await request<Exhibition>(`/api/exhibitions/${exhibition.value.id}`, {
    method: 'PATCH',
    body: exhibition.value
  })
  status.value = '展览已更新。'
}

const publish = async () => {
  if (!exhibition.value) {
    return
  }
  exhibition.value = await request<Exhibition>(`/api/exhibitions/${exhibition.value.id}/publish`, {
    method: 'POST'
  })
  status.value = '展览已发布。'
}

const remove = async () => {
  if (!exhibition.value) {
    return
  }
  await request(`/api/exhibitions/${exhibition.value.id}`, { method: 'DELETE' })
  await navigateTo('/exhibitions')
}

const attachArtwork = (artwork: Artwork) => {
  if (!exhibition.value) {
    return
  }
  exhibition.value.artwork_ids = [...exhibition.value.artwork_ids, artwork.id]
}

const detachArtwork = (artwork: Artwork) => {
  if (!exhibition.value) {
    return
  }
  exhibition.value.artwork_ids = exhibition.value.artwork_ids.filter((item) => item !== artwork.id)
}
</script>

<template>
  <div class="shell space-y-12">
    <section v-if="exhibition" class="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
      <div class="relative overflow-hidden rounded-[1.35rem] border border-ink/10 bg-ink shadow-card">
        <img :src="exhibition.cover_image_url || '/images/hero.png'" :alt="exhibition.title" decoding="async" class="h-full min-h-[30rem] w-full object-cover opacity-[0.92]">
        <div class="absolute left-5 top-5 rounded-full px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-white backdrop-blur" :class="exhibition.status === 'published' ? 'bg-forest/85' : 'bg-ember/85'">
          {{ exhibitionStatusLabel[exhibition.status] }}
        </div>
      </div>
      <div class="flex flex-col justify-between border-y border-ink/10 py-8 md:py-10">
        <p class="section-kicker">展览详情</p>
        <div>
          <h1 class="mt-4 font-display text-5xl leading-none md:text-6xl">{{ exhibition.title }}</h1>
          <p class="mt-6 text-lg leading-8 text-ink/64">{{ exhibition.description }}</p>
        </div>
        <div class="mt-8 grid grid-cols-3 gap-3 border-t border-ink/10 pt-5 text-xs font-bold text-ink/45">
          <span>策展人<br><b class="mt-1 block text-sm text-ink">{{ exhibition.curator_name }}</b></span>
          <span>状态<br><b class="mt-1 block text-sm text-ink">{{ exhibitionStatusLabel[exhibition.status] }}</b></span>
          <span>作品数<br><b class="mt-1 block text-sm text-ink">{{ exhibition.artwork_ids.length }}</b></span>
        </div>
      </div>
    </section>

    <section v-if="exhibition" class="space-y-6">
      <SectionTitle
        kicker="展览作品"
        title="展览作品"
        description="公开访客可以直接浏览已加入展览的作品；策展人可继续调整挂画顺序和作品集合。"
      />
      <div v-if="exhibitionArtworks.length" class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <ArtworkCard
          v-for="artwork in exhibitionArtworks"
          :key="artwork.id"
          :artwork="artwork"
          @select="selectedArtwork = artwork"
        />
      </div>
      <EmptyState
        v-else
        title="这场展览还没有挂上作品"
        description="教师或管理员可以在下方管理区域继续添加作品。"
      />
    </section>

    <section v-if="exhibition && canEdit" class="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <div class="panel sticky top-32 self-start px-6 py-8 md:px-8">
        <p class="section-kicker">策展管理</p>
        <h2 class="mt-3 font-display text-4xl leading-none">策展控制台</h2>
        <div class="mt-6 grid gap-4">
          <input v-model="exhibition.title" class="field-input" type="text">
          <textarea v-model="exhibition.description" class="field-input min-h-24" />
          <input v-model="exhibition.cover_image_url" class="field-input" type="text" placeholder="封面图片地址，可留空">
        </div>
        <div class="mt-6 flex flex-wrap gap-3">
          <button class="button-primary" @click="save">保存修改</button>
          <button class="button-secondary" @click="publish">发布展览</button>
          <button class="button-danger" @click="remove">删除展览</button>
        </div>
        <p v-if="status" class="mt-4 rounded-xl border border-ink/10 bg-white/70 px-4 py-3 text-sm font-semibold text-ink/70">{{ status }}</p>
      </div>

      <div class="panel studio-grid px-4 py-5 md:px-6">
        <p class="section-kicker">可选作品</p>
        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <article v-for="artwork in remainingArtworks" :key="artwork.id" class="overflow-hidden rounded-[1.1rem] border border-ink/10 bg-white/78 shadow-soft">
            <img :src="artwork.thumbnail_url || artwork.image_url" :alt="artwork.title" loading="lazy" decoding="async" class="aspect-[4/5] w-full object-cover">
            <div class="space-y-3 px-4 py-4">
              <h3 class="font-display text-2xl leading-tight">{{ artwork.title }}</h3>
              <button class="button-secondary w-full" @click="attachArtwork(artwork)">加入展览</button>
            </div>
          </article>
        </div>
        <div v-if="exhibitionArtworks.length" class="mt-8 space-y-3">
          <p class="field-label">已加入的作品</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="artwork in exhibitionArtworks"
              :key="artwork.id"
              class="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white transition hover:bg-ember"
              @click="detachArtwork(artwork)"
            >
              移除 {{ artwork.title }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <ArtworkViewer :artwork="selectedArtwork" @close="selectedArtwork = null" />
  </div>
</template>
