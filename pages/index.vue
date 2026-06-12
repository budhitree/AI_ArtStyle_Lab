<script setup lang="ts">
import type { Artwork, Exhibition, AppBootstrap } from '~/shared/types'

const selectedArtwork = ref<Artwork | null>(null)
const artworkDisplayCount = ref(12)
const exhibitionDisplayCount = ref(6)

const { data: bootstrap, refresh } = await useAsyncData('bootstrap', () => $fetch<AppBootstrap>('/api/bootstrap'))

const artworks = computed(() => bootstrap.value?.artworks ?? [])
const exhibitions = computed(() => bootstrap.value?.exhibitions ?? [])
const visibleArtworks = computed(() => artworks.value.slice(0, artworkDisplayCount.value))
const visibleExhibitions = computed(() => exhibitions.value.slice(0, exhibitionDisplayCount.value))

watch(() => bootstrap.value?.me, (profile) => {
  if (profile) {
    const auth = useAuthStore()
    auth.profile = profile
  }
}, { immediate: true })

const spotlight = computed(() => artworks.value[0] ?? null)

const onSelectArtwork = (artwork: Artwork) => {
  selectedArtwork.value = artwork
}
</script>

<template>
  <div class="shell space-y-16">
    <section class="grid min-h-[calc(100vh-11rem)] gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
      <div class="flex flex-col justify-between border-y border-ink/10 py-8 md:py-12">
        <div>
          <p class="section-kicker">Campus AI Art Museum</p>
          <h1 class="mt-5 max-w-4xl text-balance font-display text-5xl leading-[0.94] text-ink md:text-7xl">
            校园里的 AI 艺术创作与线上展厅
          </h1>
          <p class="mt-7 max-w-2xl text-lg leading-8 text-ink/64">
            从课堂作业、AI 生成到主题策展，学生和教师在同一个空间里完成创作、收藏与公开展示。
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <NuxtLink class="button-primary" to="/create">进入创作工作台</NuxtLink>
            <NuxtLink class="button-secondary" to="/exhibitions">浏览线上展厅</NuxtLink>
          </div>
        </div>

        <div class="mt-10 grid grid-cols-3 gap-3">
          <div class="border-l border-ink/15 pl-4">
            <p class="font-display text-4xl">{{ artworks.length }}</p>
            <p class="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-ink/45">Works</p>
          </div>
          <div class="border-l border-ink/15 pl-4">
            <p class="font-display text-4xl">{{ exhibitions.length }}</p>
            <p class="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-ink/45">Shows</p>
          </div>
          <div class="border-l border-ink/15 pl-4">
            <p class="font-display text-4xl">AI</p>
            <p class="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-ink/45">Studio</p>
          </div>
        </div>
      </div>

      <div class="relative min-h-[30rem] overflow-hidden rounded-[1.35rem] border border-ink/10 bg-ink shadow-card">
        <img
          :src="spotlight?.image_url || '/images/hero.png'"
          :alt="spotlight?.title || 'AI ArtStyle Lab hero image'"
          class="h-full min-h-[30rem] w-full object-cover opacity-[0.92]"
        >
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/82 to-transparent p-6 text-white md:p-8">
          <p class="text-xs font-extrabold uppercase tracking-[0.24em] text-white/60">Featured wall</p>
          <h2 class="mt-3 max-w-lg font-display text-4xl leading-none">{{ spotlight?.title || 'AI ArtStyle Lab' }}</h2>
          <p class="mt-3 max-w-xl text-sm leading-7 text-white/70">{{ spotlight?.description || '一个面向校内师生的 AI 艺术创作、作品管理与主题展览空间。' }}</p>
        </div>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-3">
      <div class="muted-panel px-6 py-6">
        <p class="section-kicker">01</p>
        <h3 class="mt-3 font-display text-3xl">AI 创作工作台</h3>
        <p class="mt-3 text-sm leading-7 text-ink/62">用结构化提示词生成图像，并直接把结果写入作品库。</p>
      </div>
      <div class="muted-panel px-6 py-6">
        <p class="section-kicker">02</p>
        <h3 class="mt-3 font-display text-3xl">作品管理</h3>
        <p class="mt-3 text-sm leading-7 text-ink/62">支持上传、公开/隐藏、筛选、编辑和后续策展调用。</p>
      </div>
      <div class="muted-panel px-6 py-6">
        <p class="section-kicker">03</p>
        <h3 class="mt-3 font-display text-3xl">线上展厅</h3>
        <p class="mt-3 text-sm leading-7 text-ink/62">教师和管理员可以把作品编排成公开展览，形成完整叙事。</p>
      </div>
    </section>

    <section class="space-y-6">
      <SectionTitle
        kicker="Public Gallery"
        title="公开作品"
        description="首页只展示允许公开的作品。点开卡片可以查看作品详情、Prompt 和作者。"
      />
      <div v-if="artworks.length" class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <ArtworkCard
          v-for="artwork in visibleArtworks"
          :key="artwork.id"
          :artwork="artwork"
          @select="onSelectArtwork"
        />
      </div>
      <div v-if="visibleArtworks.length < artworks.length" class="flex justify-center">
        <button class="button-secondary" @click="artworkDisplayCount += 12">
          加载更多作品
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
        kicker="Curated Exhibitions"
        title="主题展览"
        description="已发布展览会出现在这里；草稿状态只对策展人自己可见。"
      />
      <div v-if="exhibitions.length" class="grid gap-5">
        <ExhibitionCard
          v-for="exhibition in visibleExhibitions"
          :key="exhibition.id"
          :exhibition="exhibition"
        />
      </div>
      <div v-if="visibleExhibitions.length < exhibitions.length" class="flex justify-center">
        <button class="button-secondary" @click="exhibitionDisplayCount += 6">
          加载更多展览
        </button>
      </div>
      <EmptyState
        v-if="!exhibitions.length"
        title="还没有发布中的展览"
        description="教师或管理员创建并发布展览后，公开访客才能在首页看到。"
      />
    </section>

    <ArtworkViewer :artwork="selectedArtwork" @close="selectedArtwork = null" />
  </div>
</template>
