<script setup lang="ts">
import type { Exhibition } from '~/shared/types'
import { exhibitionStatusLabel } from '~/shared/labels'

defineProps<{
  exhibition: Exhibition
}>()
</script>

<template>
  <NuxtLink :to="`/exhibitions/${exhibition.id}`" class="block">
    <article class="group grid overflow-hidden rounded-[1.25rem] border border-ink/10 bg-[rgba(255,252,244,0.86)] shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-card md:grid-cols-[0.95fr_1.05fr]">
      <div class="relative min-h-64 overflow-hidden bg-ink/5">
        <img
          :src="exhibition.cover_image_url || '/images/hero.png'"
          :alt="exhibition.title"
          loading="lazy"
          decoding="async"
          class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        >
        <span class="absolute left-4 top-4 rounded-full px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.18em] backdrop-blur" :class="exhibition.status === 'published' ? 'bg-forest/90 text-white' : 'bg-ember/90 text-white'">
          {{ exhibitionStatusLabel[exhibition.status] }}
        </span>
      </div>
      <div class="flex min-h-64 flex-col justify-between px-6 py-6">
        <div class="space-y-4">
          <p class="section-kicker">主题展览</p>
          <h3 class="font-display text-4xl leading-none">{{ exhibition.title }}</h3>
          <p class="line-clamp-3 text-sm leading-7 text-ink/60">{{ exhibition.description }}</p>
        </div>
        <div class="mt-8 flex items-center justify-between border-t border-ink/10 pt-4 text-xs font-bold text-ink/40">
          <span>{{ exhibition.curator_name }}</span>
          <span>{{ exhibition.artwork_ids.length }} 件作品</span>
        </div>
      </div>
    </article>
  </NuxtLink>
</template>
