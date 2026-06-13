<script setup lang="ts">
import type { Artwork } from '~/shared/types'
import { sourceTypeLabel } from '~/shared/labels'

const props = defineProps<{
  artwork: Artwork | null
}>()

const emit = defineEmits<{
  close: []
}>()

watch(() => props.artwork, (value) => {
  if (import.meta.client) {
    document.body.style.overflow = value ? 'hidden' : ''
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Transition name="fade">
    <div
      v-if="artwork"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-ink/82 px-4 py-8 backdrop-blur-xl"
      @click.self="emit('close')"
    >
      <div class="grid w-full max-w-6xl gap-4 lg:grid-cols-[1.18fr_0.82fr]">
        <div class="art-frame bg-white/10 p-2 shadow-2xl">
          <img :src="artwork.image_url" :alt="artwork.title" decoding="async" class="max-h-[78vh] w-full rounded-xl object-contain">
        </div>
        <div class="rounded-[1.25rem] bg-mist px-6 py-7 shadow-2xl">
          <div class="mb-6 flex items-start justify-between gap-4">
            <div>
              <p class="section-kicker">作品详情</p>
              <h3 class="mt-3 font-display text-4xl leading-none">{{ artwork.title }}</h3>
            </div>
            <button class="button-secondary px-4" @click="emit('close')">关闭</button>
          </div>
          <div class="space-y-5 text-sm leading-7 text-ink/68">
            <p>{{ artwork.description }}</p>
            <div class="grid gap-4 rounded-xl border border-ink/10 bg-white/58 px-4 py-4">
              <div>
                <p class="field-label">创作者</p>
                <p class="mt-1 text-base font-semibold text-ink">{{ artwork.owner_name }}</p>
              </div>
              <div>
                <p class="field-label">来源</p>
                <p class="mt-1 text-base font-semibold text-ink">{{ sourceTypeLabel[artwork.source_type] }}</p>
              </div>
              <div v-if="artwork.prompt">
                <p class="field-label">Prompt</p>
                <p class="mt-1 whitespace-pre-line text-base text-ink/80">{{ artwork.prompt }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
