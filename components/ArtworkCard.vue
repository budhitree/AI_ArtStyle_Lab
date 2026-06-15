<script setup lang="ts">
import type { Artwork } from '~/shared/types'
import { sourceTypeLabel, visibilityLabel } from '~/shared/labels'

defineProps<{
  artwork: Artwork
}>()

defineEmits<{
  select: [artwork: Artwork]
}>()
</script>

<template>
  <button class="group w-full text-left" @click="$emit('select', artwork)">
    <article class="overflow-hidden rounded-[1.15rem] border border-ink/10 bg-[rgba(255,252,244,0.82)] shadow-soft transition duration-300 group-hover:-translate-y-1 group-hover:shadow-card">
      <div class="relative aspect-[4/5] overflow-hidden bg-ink/5">
        <img
          :src="artwork.thumbnail_url || artwork.image_url"
          :alt="artwork.title"
          loading="lazy"
          decoding="async"
          class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        >
        <div class="absolute left-3 top-3 flex flex-wrap gap-2">
          <span class="status-pill bg-white/80">{{ sourceTypeLabel[artwork.source_type] }}</span>
          <span class="status-pill bg-white/80">{{ visibilityLabel[artwork.visibility] }}</span>
        </div>
      </div>
      <div class="space-y-3 px-4 py-4 lg:space-y-4 lg:px-5 lg:py-5">
        <div>
          <h3 class="font-display text-xl leading-tight lg:text-2xl">{{ artwork.title }}</h3>
          <p class="mt-2 line-clamp-2 text-xs leading-6 text-ink/60 lg:text-sm lg:leading-7">{{ artwork.description }}</p>
        </div>
        <div class="flex items-center justify-between border-t border-ink/10 pt-3 text-xs font-bold text-ink/40 lg:pt-4">
          <span>{{ artwork.owner_name }}</span>
          <span>查看详情</span>
        </div>
      </div>
    </article>
  </button>
</template>
