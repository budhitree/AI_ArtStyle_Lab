<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

import type { Artwork } from '~/shared/types'
import { sourceTypeLabel, visibilityLabel } from '~/shared/labels'

const { request } = useApi()
const artworks = ref<Artwork[]>([])
const selectedArtwork = ref<Artwork | null>(null)
const status = ref('')
const filter = ref<'all' | 'public' | 'private' | 'ai' | 'upload'>('all')
const pageSize = 12
const isLoading = ref(false)
const hasMore = ref(false)
const filterOptions = [
  { value: 'all', label: '全部' },
  { value: 'public', label: '公开' },
  { value: 'private', label: '仅自己可见' },
  { value: 'ai', label: 'AI 创作' },
  { value: 'upload', label: '上传作品' }
] as const

const load = async (reset = false) => {
  if (isLoading.value) {
    return
  }

  isLoading.value = true
  try {
    if (reset) {
      artworks.value = []
      selectedArtwork.value = null
    }

    const query: Record<string, string | number> = {
      scope: 'mine',
      limit: pageSize + 1,
      offset: artworks.value.length
    }
    if (filter.value === 'public' || filter.value === 'private') {
      query.visibility = filter.value
    }
    if (filter.value === 'ai' || filter.value === 'upload') {
      query.source_type = filter.value
    }

    const next = await request<Artwork[]>('/api/artworks', { query })
    artworks.value = [...artworks.value, ...next.slice(0, pageSize)]
    hasMore.value = next.length > pageSize
  } finally {
    isLoading.value = false
  }
}

await callOnce(() => load(true))

watch(filter, () => {
  load(true)
})

const save = async () => {
  if (!selectedArtwork.value) {
    return
  }

  try {
    const updated = await request<Artwork>(`/api/artworks/${selectedArtwork.value.id}`, {
      method: 'PATCH',
      body: {
        title: selectedArtwork.value.title,
        description: selectedArtwork.value.description,
        prompt: selectedArtwork.value.prompt,
        visibility: selectedArtwork.value.visibility
      }
    })
    artworks.value = artworks.value.map((item) => item.id === updated.id ? updated : item)
    status.value = '作品已更新。'
  } catch (error) {
    status.value = error instanceof Error ? error.message : '更新失败'
  }
}

const remove = async (artwork: Artwork) => {
  await request(`/api/artworks/${artwork.id}`, { method: 'DELETE' })
  artworks.value = artworks.value.filter((item) => item.id !== artwork.id)
  if (selectedArtwork.value?.id === artwork.id) {
    selectedArtwork.value = null
  }
}

const editArtwork = (artwork: Artwork) => {
  selectedArtwork.value = { ...artwork }
}
</script>

<template>
  <div class="shell grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
    <section class="space-y-6">
      <SectionTitle
        kicker="我的作品"
        title="整理自己的作品墙。"
        description="这里统一承接 AI 生成和手工上传的作品。公开状态会直接影响首页和展览里的可见性。"
      />

      <div class="flex flex-wrap gap-2 border-y border-ink/10 py-3">
        <button
          v-for="item in filterOptions"
          :key="item.value"
          class="rounded-full px-4 py-2 text-sm font-extrabold transition"
          :class="filter === item.value ? 'bg-ink text-white shadow-soft' : 'bg-white/70 text-ink/62 hover:bg-white'"
          @click="filter = item.value"
        >
          {{ item.label }}
        </button>
      </div>

      <div v-if="artworks.length" class="grid gap-5 md:grid-cols-2">
        <article
          v-for="artwork in artworks"
          :key="artwork.id"
          class="overflow-hidden rounded-[1.15rem] border border-ink/10 bg-[rgba(255,252,244,0.82)] shadow-soft"
        >
          <div class="relative">
            <img :src="artwork.thumbnail_url || artwork.image_url" :alt="artwork.title" loading="lazy" decoding="async" class="aspect-[4/5] w-full object-cover">
            <div class="absolute left-3 top-3 flex flex-wrap gap-2">
              <span class="status-pill bg-white/82">{{ visibilityLabel[artwork.visibility] }}</span>
              <span class="status-pill bg-white/82">{{ sourceTypeLabel[artwork.source_type] }}</span>
            </div>
          </div>
          <div class="space-y-4 px-5 py-5">
            <div>
              <h3 class="font-display text-2xl leading-tight">{{ artwork.title }}</h3>
              <p class="mt-2 line-clamp-2 text-sm leading-7 text-ink/60">{{ artwork.description }}</p>
            </div>
            <div class="flex gap-2">
              <button class="button-secondary" @click="editArtwork(artwork)">编辑</button>
              <button class="button-danger" @click="remove(artwork)">删除</button>
            </div>
          </div>
        </article>
      </div>
      <div v-if="hasMore" class="flex justify-center">
        <button class="button-secondary" :disabled="isLoading" @click="load()">
          {{ isLoading ? '加载中...' : '加载更多作品' }}
        </button>
      </div>
      <EmptyState
        v-if="!artworks.length && !isLoading"
        title="你的作品库还是空的"
        description="先到创作页或上传页生成内容，回来后就能在这里做精细管理。"
      />
    </section>

    <section class="panel sticky top-32 self-start px-6 py-8 md:px-8">
      <SectionTitle
        kicker="作品编辑"
        title="作品编辑器"
        description="选中左侧作品后，在这里调整标题、描述、Prompt 和公开状态。"
      />

      <div v-if="selectedArtwork" class="mt-8 grid gap-4">
        <div class="art-frame bg-white p-2">
          <img :src="selectedArtwork.image_url" :alt="selectedArtwork.title" class="max-h-[18rem] w-full rounded-xl object-cover">
        </div>
        <label class="block space-y-2">
          <span class="field-label">标题</span>
          <input v-model="selectedArtwork.title" class="field-input" type="text">
        </label>
        <label class="block space-y-2">
          <span class="field-label">简介</span>
          <textarea v-model="selectedArtwork.description" class="field-input min-h-24" />
        </label>
        <label class="block space-y-2">
          <span class="field-label">Prompt</span>
          <textarea v-model="selectedArtwork.prompt" class="field-input min-h-24" />
        </label>
        <label class="block space-y-2">
          <span class="field-label">公开状态</span>
          <select v-model="selectedArtwork.visibility" class="field-input">
            <option value="public">公开</option>
            <option value="private">私有</option>
          </select>
        </label>
        <button class="button-primary" @click="save">保存修改</button>
        <p v-if="status" class="rounded-xl border border-ink/10 bg-white/70 px-4 py-3 text-sm font-semibold text-ink/70">{{ status }}</p>
      </div>
      <EmptyState
        v-else
        title="还没有选中作品"
        description="从左侧卡片点“编辑”后，这里会出现对应表单。"
      />
    </section>
  </div>
</template>
