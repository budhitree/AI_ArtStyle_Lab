<script setup lang="ts">
import type { Artwork, Exhibition, AppBootstrap } from '~/shared/types'

const selectedArtwork = ref<Artwork | null>(null)
const artworkPageSize = 24
const exhibitionPageSize = 6
const artworks = ref<Artwork[]>([])
const immersiveArtworks = ref<Artwork[]>([])
const exhibitions = ref<Exhibition[]>([])
const publicArtworkCount = ref(0)
const artworkBusy = ref(false)
const immersiveBusy = ref(false)
const exhibitionBusy = ref(false)
const hasMoreArtworks = ref(false)
const hasMoreExhibitions = ref(false)
const spotlightIndex = ref(0)
const immersiveOpen = ref(false)
const immersiveStartIndex = ref(0)
let spotlightTimer: ReturnType<typeof setInterval> | null = null

const { data: bootstrap } = await useAsyncData('bootstrap', () => $fetch<AppBootstrap>('/api/bootstrap'))

watch(bootstrap, (value) => {
  const initialArtworks = value?.artworks ?? []
  const initialExhibitions = value?.exhibitions ?? []
  publicArtworkCount.value = value?.publicArtworkCount ?? initialArtworks.length
  artworks.value = initialArtworks.slice(0, artworkPageSize)
  immersiveArtworks.value = initialArtworks
  exhibitions.value = initialExhibitions.slice(0, exhibitionPageSize)
  hasMoreArtworks.value = publicArtworkCount.value > artworks.value.length
  hasMoreExhibitions.value = initialExhibitions.length > exhibitionPageSize
  spotlightIndex.value = 0
}, { immediate: true })

watch(() => bootstrap.value?.me, (profile) => {
  if (profile) {
    const auth = useAuthStore()
    auth.profile = profile
  }
}, { immediate: true })

const spotlightItems = computed(() => artworks.value.slice(0, 6))
const spotlight = computed(() => spotlightItems.value[spotlightIndex.value % Math.max(spotlightItems.value.length, 1)] ?? null)
const spotlightImage = computed(() => spotlight.value?.thumbnail_url || spotlight.value?.image_url || '/images/hero.png')

const startSpotlightTimer = () => {
  if (!import.meta.client) {
    return
  }
  if (spotlightTimer) {
    clearInterval(spotlightTimer)
  }
  spotlightTimer = setInterval(() => {
    if (spotlightItems.value.length > 1) {
      spotlightIndex.value = (spotlightIndex.value + 1) % spotlightItems.value.length
    }
  }, 5200)
}

watch(() => spotlightItems.value.length, startSpotlightTimer, { immediate: true })

onBeforeUnmount(() => {
  if (spotlightTimer) {
    clearInterval(spotlightTimer)
  }
})

const onSelectArtwork = (artwork: Artwork) => {
  selectedArtwork.value = artwork
}

const ensureImmersiveArtworks = async () => {
  if (immersiveBusy.value || immersiveArtworks.value.length >= publicArtworkCount.value) {
    return
  }

  immersiveBusy.value = true
  try {
    immersiveArtworks.value = await $fetch<Artwork[]>('/api/artworks', {
      query: {
        random: true
      }
    })
  } catch {
    immersiveArtworks.value = immersiveArtworks.value.length ? immersiveArtworks.value : artworks.value
  } finally {
    immersiveBusy.value = false
  }
}

const openImmersive = async (artwork?: Artwork | null) => {
  if (!artworks.value.length && !immersiveArtworks.value.length) {
    return
  }

  await ensureImmersiveArtworks()
  const gallery = immersiveArtworks.value.length ? immersiveArtworks.value : artworks.value
  const index = artwork ? gallery.findIndex((item) => item.id === artwork.id) : spotlightIndex.value
  immersiveStartIndex.value = index >= 0 ? index : 0
  immersiveOpen.value = true
}

const loadMoreArtworks = async () => {
  if (artworkBusy.value || !hasMoreArtworks.value) {
    return
  }

  artworkBusy.value = true
  try {
    const next = await $fetch<Artwork[]>('/api/artworks', {
      query: {
        exclude: artworks.value.map((artwork) => artwork.id).join(','),
        limit: artworkPageSize,
        random: true
      }
    })
    artworks.value = [...artworks.value, ...next]
    hasMoreArtworks.value = publicArtworkCount.value > artworks.value.length && next.length > 0
  } finally {
    artworkBusy.value = false
  }
}

const loadMoreExhibitions = async () => {
  if (exhibitionBusy.value || !hasMoreExhibitions.value) {
    return
  }

  exhibitionBusy.value = true
  try {
    const next = await $fetch<Exhibition[]>('/api/exhibitions', {
      query: {
        limit: exhibitionPageSize,
        offset: exhibitions.value.length
      }
    })
    exhibitions.value = [...exhibitions.value, ...next]
    hasMoreExhibitions.value = next.length === exhibitionPageSize
  } finally {
    exhibitionBusy.value = false
  }
}
</script>

<template>
  <div class="shell space-y-16">
    <section class="grid gap-5 lg:grid-cols-[0.9fr_1fr] lg:items-start">
      <div class="flex flex-col border-y border-ink/10 py-8 md:py-10">
        <div>
          <p class="section-kicker">校园 AI 艺术展厅</p>
          <h1 class="mt-5 max-w-4xl text-balance font-display text-5xl leading-[0.94] text-ink md:text-7xl">
            校园里的 AI 艺术创作与线上展厅
          </h1>
          <p class="mt-7 max-w-2xl text-lg leading-8 text-ink/64">
            从课堂作业、AI 生成到主题策展，学生和教师在同一个空间里完成创作、收藏与公开展示。
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <NuxtLink class="button-primary" to="/create">进入创作工作台</NuxtLink>
            <NuxtLink class="button-secondary" to="/exhibitions">浏览线上展厅</NuxtLink>
            <button class="button-secondary" type="button" :disabled="!artworks.length || immersiveBusy" @click="openImmersive(spotlight)">
              {{ immersiveBusy ? '准备中...' : '沉浸模式观看' }}
            </button>
          </div>
        </div>

        <div class="mt-12 grid grid-cols-3 gap-3">
          <div class="border-l border-ink/15 pl-4">
            <p class="font-display text-4xl">{{ publicArtworkCount }}</p>
            <p class="mt-1 text-xs font-bold text-ink/45">公开作品</p>
          </div>
          <div class="border-l border-ink/15 pl-4">
            <p class="font-display text-4xl">{{ exhibitions.length }}{{ hasMoreExhibitions ? '+' : '' }}</p>
            <p class="mt-1 text-xs font-bold text-ink/45">发布展览</p>
          </div>
          <div class="border-l border-ink/15 pl-4">
            <p class="font-display text-4xl">AI</p>
            <p class="mt-1 text-xs font-bold text-ink/45">创作空间</p>
          </div>
        </div>
      </div>

      <div class="relative aspect-square overflow-hidden rounded-[1.35rem] border border-ink/10 bg-ink shadow-card">
        <Transition name="fade" mode="out-in">
          <img
            :key="spotlight?.id || 'fallback'"
            :src="spotlightImage"
            :alt="spotlight?.title || 'AI ArtStyle Lab hero image'"
            fetchpriority="high"
            decoding="async"
            class="h-full w-full object-cover opacity-[0.92]"
          >
        </Transition>
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/82 to-transparent p-6 text-white md:p-8">
          <p class="text-xs font-extrabold text-white/60">推荐作品</p>
          <h2 class="mt-3 max-w-lg font-display text-4xl leading-none">{{ spotlight?.title || 'AI ArtStyle Lab' }}</h2>
          <p class="mt-3 max-w-xl text-sm leading-7 text-white/70">{{ spotlight?.description || '一个面向校内师生的 AI 艺术创作、作品管理与主题展览空间。' }}</p>
        </div>
      </div>
    </section>

    <section class="space-y-6">
      <SectionTitle
        kicker="公共画廊"
        title="公开作品"
        description="首页只展示允许公开的作品。点开卡片可以查看作品详情、Prompt 和作者。"
      />
      <div v-if="artworks.length" class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <ArtworkCard
          v-for="artwork in artworks"
          :key="artwork.id"
          :artwork="artwork"
          @select="onSelectArtwork"
        />
      </div>
      <div v-if="hasMoreArtworks" class="flex justify-center">
        <button class="button-secondary" :disabled="artworkBusy" @click="loadMoreArtworks">
          {{ artworkBusy ? '加载中...' : '加载更多作品' }}
        </button>
      </div>
      <EmptyState
        v-if="!artworks.length"
        title="还没有公开作品"
        description="请先到“上传作品”或“AI 创作”页面生成内容，或连接 Supabase 后读取你的真实数据。"
      />
    </section>

    <section class="space-y-6">
      <SectionTitle
        kicker="主题展览"
        title="主题展览"
        description="已发布展览会出现在这里；草稿状态只对策展人自己可见。"
      />
      <div v-if="exhibitions.length" class="grid gap-5">
        <ExhibitionCard
          v-for="exhibition in exhibitions"
          :key="exhibition.id"
          :exhibition="exhibition"
        />
      </div>
      <div v-if="hasMoreExhibitions" class="flex justify-center">
        <button class="button-secondary" :disabled="exhibitionBusy" @click="loadMoreExhibitions">
          {{ exhibitionBusy ? '加载中...' : '加载更多展览' }}
        </button>
      </div>
      <EmptyState
        v-if="!exhibitions.length"
        title="还没有发布中的展览"
        description="教师或管理员创建并发布展览后，公开访客才能在首页看到。"
      />
    </section>

    <ArtworkViewer :artwork="selectedArtwork" @close="selectedArtwork = null" />
    <ImmersiveViewer
      v-model="immersiveOpen"
      :artworks="immersiveArtworks.length ? immersiveArtworks : artworks"
      :initial-index="immersiveStartIndex"
      title="公共画廊沉浸模式"
    />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.35s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
