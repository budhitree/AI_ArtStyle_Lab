<script setup lang="ts">
import type { Artwork, Exhibition } from '~/shared/types'
import { exhibitionStatusLabel } from '~/shared/labels'

const route = useRoute()
const auth = useAuthStore()
const { request } = useApi()

const selectedArtwork = ref<Artwork | null>(null)
const status = ref('')
const pageStatus = ref('')
const pageBusy = ref(true)
const immersiveOpen = ref(false)
const immersiveStartIndex = ref(0)
const exhibition = ref<Exhibition | null>(null)
const availableArtworks = ref<Artwork[]>([])
const curationArtworks = ref<Artwork[]>([])
const curationPageSize = 48
const curationBusy = ref(false)
const hasMoreCuration = ref(false)

const canEdit = computed(() =>
  Boolean(
    auth.profile &&
    exhibition.value &&
    (auth.profile.role === 'admin' || auth.profile.id === exhibition.value.curator_id)
  )
)

const mergeAvailableArtworks = (items: Artwork[]) => {
  const merged = new Map([...availableArtworks.value, ...items].map((artwork) => [artwork.id, artwork]))
  availableArtworks.value = [...merged.values()]
}

const uniqueArtworkIds = (ids: string[]) => [...new Set(ids.filter(Boolean))]

const loadExhibitionArtworks = async () => {
  if (!exhibition.value?.artwork_ids.length) {
    return
  }

  const artworks = await request<Artwork[]>('/api/artworks', {
    query: {
      scope: 'exhibition',
      exhibition_id: exhibition.value.id,
      ids: exhibition.value.artwork_ids.join(','),
    }
  })
  mergeAvailableArtworks(artworks)
}

const loadCurationArtworks = async (reset = false) => {
  if (!canEdit.value) {
    curationArtworks.value = []
    hasMoreCuration.value = false
    return
  }

  if (curationBusy.value) {
    return
  }

  curationBusy.value = true
  try {
    if (reset) {
      curationArtworks.value = []
    }

    const next = await request<Artwork[]>('/api/artworks', {
      query: {
        scope: 'curation',
        limit: curationPageSize + 1,
        offset: curationArtworks.value.length
      }
    })
    const page = next.slice(0, curationPageSize)
    curationArtworks.value = [...new Map([...curationArtworks.value, ...page].map((artwork) => [artwork.id, artwork])).values()]
    hasMoreCuration.value = next.length > curationPageSize
    mergeAvailableArtworks(page)
  } finally {
    curationBusy.value = false
  }
}

const load = async () => {
  pageBusy.value = true
  pageStatus.value = ''
  try {
    if (import.meta.client && !auth.initialized) {
      await auth.initialize()
    }

    exhibition.value = await request<Exhibition>(`/api/exhibitions/${route.params.id}`)
    exhibition.value.artwork_ids = uniqueArtworkIds(exhibition.value.artwork_ids)
    availableArtworks.value = []
    curationArtworks.value = []
    hasMoreCuration.value = false
    await loadExhibitionArtworks()
    if (canEdit.value) {
      await loadCurationArtworks(true)
    }
  } catch (error) {
    exhibition.value = null
    availableArtworks.value = []
    curationArtworks.value = []
    pageStatus.value = error instanceof Error ? error.message : '展览加载失败'
  } finally {
    pageBusy.value = false
  }
}

if (import.meta.client) {
  onMounted(load)
}

watch(() => route.params.id, () => {
  if (import.meta.client) {
    load()
  }
})

watch(() => auth.profile?.id, () => {
  if (import.meta.client) {
    load()
  }
})

const exhibitionArtworks = computed(() => {
  if (!exhibition.value) {
    return []
  }
  const artworkMap = new Map(availableArtworks.value.map((item) => [item.id, item]))
  return uniqueArtworkIds(exhibition.value.artwork_ids)
    .map((id) => artworkMap.get(id))
    .filter(Boolean) as Artwork[]
})

const selectedArtworkIds = computed(() => new Set(exhibition.value?.artwork_ids || []))

const exhibitionArtworkCount = computed(() => uniqueArtworkIds(exhibition.value?.artwork_ids || []).length)

const loadedCurationCount = computed(() => new Set(curationArtworks.value.map((artwork) => artwork.id)).size)

const selectableArtworkCount = computed(() =>
  curationArtworks.value.filter((item) => !selectedArtworkIds.value.has(item.id)).length
)

const curationSummary = computed(() => `已选 ${exhibitionArtworkCount.value} 件 / 本次已加载 ${loadedCurationCount.value} 件`)

const savePayload = computed(() => {
  if (!exhibition.value) {
    return null
  }

  return {
    ...exhibition.value,
    artwork_ids: uniqueArtworkIds(exhibition.value.artwork_ids)
  }
})

const remainingArtworks = computed(() => {
  if (!exhibition.value) {
    return []
  }
  return curationArtworks.value.filter((item) => !selectedArtworkIds.value.has(item.id))
})

const openImmersive = (artwork?: Artwork) => {
  if (!exhibitionArtworks.value.length) {
    return
  }
  const index = artwork ? exhibitionArtworks.value.findIndex((item) => item.id === artwork.id) : 0
  immersiveStartIndex.value = index >= 0 ? index : 0
  immersiveOpen.value = true
}

const save = async () => {
  if (!exhibition.value || !savePayload.value) {
    return
  }
  exhibition.value = await request<Exhibition>(`/api/exhibitions/${exhibition.value.id}`, {
    method: 'PATCH',
    body: savePayload.value
  })
  exhibition.value.artwork_ids = uniqueArtworkIds(exhibition.value.artwork_ids)
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
  if (selectedArtworkIds.value.has(artwork.id)) {
    status.value = '这件作品已经在展览中。'
    return
  }
  mergeAvailableArtworks([artwork])
  exhibition.value.artwork_ids = [...exhibition.value.artwork_ids, artwork.id]
}

const detachArtwork = (artwork: Artwork) => {
  if (!exhibition.value) {
    return
  }
  exhibition.value.artwork_ids = uniqueArtworkIds(exhibition.value.artwork_ids).filter((item) => item !== artwork.id)
}
</script>

<template>
  <div class="shell space-y-12">
    <div v-if="pageBusy" class="panel px-6 py-10 text-center">
      <p class="section-kicker">策展加载中</p>
      <p class="mt-3 text-sm font-semibold text-ink/60">正在读取展览和作品库...</p>
    </div>
    <EmptyState
      v-else-if="pageStatus"
      title="展览暂时无法打开"
      :description="pageStatus"
    />

    <section v-if="exhibition" class="grid gap-5 md:grid-cols-[1.08fr_0.92fr]">
      <div class="relative overflow-hidden rounded-[1.35rem] border border-ink/10 bg-ink shadow-card">
        <img :src="exhibition.cover_image_url || '/images/hero.png'" :alt="exhibition.title" decoding="async" class="h-full min-h-[24rem] w-full object-cover opacity-[0.92] lg:min-h-[30rem]">
        <div class="absolute left-5 top-5 rounded-full px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-white backdrop-blur" :class="exhibition.status === 'published' ? 'bg-forest/85' : 'bg-ember/85'">
          {{ exhibitionStatusLabel[exhibition.status] }}
        </div>
      </div>
      <div class="flex flex-col justify-between border-y border-ink/10 py-8 md:py-10">
        <p class="section-kicker">展览详情</p>
        <div>
          <h1 class="mt-4 font-display text-4xl leading-none lg:text-6xl">{{ exhibition.title }}</h1>
          <p class="mt-6 text-lg leading-8 text-ink/64">{{ exhibition.description }}</p>
          <button
            v-if="exhibitionArtworks.length"
            class="button-secondary mt-6"
            type="button"
            @click="openImmersive()"
          >
            沉浸模式观看
          </button>
        </div>
        <div class="mt-8 grid grid-cols-3 gap-3 border-t border-ink/10 pt-5 text-xs font-bold text-ink/45">
          <span>策展人<br><b class="mt-1 block text-sm text-ink">{{ exhibition.curator_name }}</b></span>
          <span>状态<br><b class="mt-1 block text-sm text-ink">{{ exhibitionStatusLabel[exhibition.status] }}</b></span>
          <span>作品数<br><b class="mt-1 block text-sm text-ink">{{ exhibitionArtworkCount }}</b></span>
        </div>
      </div>
    </section>

    <section v-if="exhibition" class="space-y-6">
      <SectionTitle
        kicker="展览作品"
        title="展览作品"
        description="公开访客可以直接浏览已加入展览的作品；策展人可继续调整挂画顺序和作品集合。"
      />
      <div v-if="exhibitionArtworks.length" class="grid gap-4 md:grid-cols-3 lg:gap-5">
        <ArtworkCard
          v-for="artwork in exhibitionArtworks"
          :key="artwork.id"
          :artwork="artwork"
          @select="selectedArtwork = artwork"
        />
      </div>
      <div v-if="exhibitionArtworks.length" class="flex justify-end">
        <button class="button-secondary" type="button" @click="openImmersive()">沉浸模式观看</button>
      </div>
      <EmptyState
        v-if="!exhibitionArtworks.length"
        title="这场展览还没有挂上作品"
        description="教师或管理员可以在下方管理区域继续添加作品。"
      />
    </section>

    <section v-if="exhibition && canEdit" class="grid gap-5 md:grid-cols-[0.82fr_1.18fr] lg:gap-6">
      <div class="panel sticky top-28 self-start px-5 py-6 lg:top-32 lg:px-8 lg:py-8">
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
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="section-kicker">学生作品库</p>
            <p class="mt-2 text-xs font-bold text-ink/45">{{ curationSummary }}</p>
          </div>
          <span class="rounded-full border border-ink/10 bg-white/70 px-3 py-1 text-xs font-extrabold text-ink/55">
            可选 {{ selectableArtworkCount }} 件
          </span>
        </div>
        <div v-if="remainingArtworks.length" class="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          <button
            v-for="artwork in remainingArtworks"
            :key="artwork.id"
            type="button"
            class="group overflow-hidden rounded-lg border border-ink/10 bg-white/82 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-ember/55 focus:outline-none focus:ring-2 focus:ring-ember/40"
            :title="`加入 ${artwork.title}`"
            @click="attachArtwork(artwork)"
          >
            <img :src="artwork.thumbnail_url || artwork.image_url" :alt="artwork.title" loading="lazy" decoding="async" class="aspect-square w-full object-cover transition duration-200 group-hover:scale-[1.03]">
            <div class="px-2 py-2">
              <p class="truncate text-xs font-extrabold text-ink">{{ artwork.title }}</p>
              <p class="mt-0.5 truncate text-[0.68rem] font-bold text-ink/45">{{ artwork.owner_name }}</p>
            </div>
          </button>
        </div>
        <EmptyState
          v-else
          title="当前加载的作品都已加入展览"
          description="可以继续加载更多作品，或在左侧保存当前策展结果。"
        />
        <div v-if="hasMoreCuration" class="mt-6 flex justify-center">
          <button class="button-secondary" :disabled="curationBusy" @click="loadCurationArtworks()">
            {{ curationBusy ? '加载中...' : '加载更多可选作品' }}
          </button>
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
    <ImmersiveViewer
      v-if="exhibition"
      v-model="immersiveOpen"
      :artworks="exhibitionArtworks"
      :initial-index="immersiveStartIndex"
      :title="`${exhibition.title} · 沉浸模式`"
    />
  </div>
</template>
