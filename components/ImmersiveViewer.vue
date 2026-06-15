<script setup lang="ts">
import type { Artwork } from '~/shared/types'

const props = withDefaults(defineProps<{
  artworks: Artwork[]
  modelValue: boolean
  initialIndex?: number
  title?: string
}>(), {
  initialIndex: 0,
  title: '沉浸模式'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const activeIndex = ref(0)
const autoplay = ref(true)
const showSettings = ref(false)
const intervalSeconds = ref(6)
const showChrome = ref(true)
let autoplayTimer: ReturnType<typeof setInterval> | null = null
let idleTimer: ReturnType<typeof setTimeout> | null = null
const preloadedUrls = new Set<string>()
const preloadWindowSize = 5

const total = computed(() => props.artworks.length)
const currentArtwork = computed(() => props.artworks[activeIndex.value] || null)
const counter = computed(() => total.value ? `${activeIndex.value + 1} / ${total.value}` : '0 / 0')

const clearAutoplayTimer = () => {
  if (autoplayTimer) {
    clearInterval(autoplayTimer)
    autoplayTimer = null
  }
}

const clearIdleTimer = () => {
  if (idleTimer) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
}

const close = () => {
  emit('update:modelValue', false)
}

const clampIndex = (index: number) => {
  if (!total.value) {
    return 0
  }
  return ((index % total.value) + total.value) % total.value
}

const goTo = (index: number) => {
  activeIndex.value = clampIndex(index)
}

const next = () => {
  goTo(activeIndex.value + 1)
}

const previous = () => {
  goTo(activeIndex.value - 1)
}

const preloadImage = (url?: string | null) => {
  if (!import.meta.client || !url || preloadedUrls.has(url)) {
    return
  }

  preloadedUrls.add(url)
  const image = new Image()
  image.decoding = 'async'
  image.src = url
  if (typeof image.decode === 'function') {
    image.decode().catch(() => {})
  }
}

const preloadUpcomingImages = () => {
  if (!props.modelValue || !total.value) {
    return
  }

  const count = Math.min(preloadWindowSize, total.value)
  for (let offset = 0; offset < count; offset += 1) {
    const artwork = props.artworks[clampIndex(activeIndex.value + offset)]
    preloadImage(artwork?.image_url)
  }
}

const startAutoplay = () => {
  clearAutoplayTimer()
  if (!props.modelValue || !autoplay.value || total.value <= 1) {
    return
  }
  autoplayTimer = setInterval(next, intervalSeconds.value * 1000)
}

const hideChromeForPlayback = () => {
  clearIdleTimer()
  if (props.modelValue && autoplay.value && !showSettings.value) {
    showChrome.value = false
  }
}

const revealChromeTemporarily = () => {
  showChrome.value = true
  clearIdleTimer()
  if (!props.modelValue || !autoplay.value || showSettings.value) {
    return
  }
  idleTimer = setTimeout(() => {
    hideChromeForPlayback()
  }, 1600)
}

const onKeydown = (event: KeyboardEvent) => {
  if (!props.modelValue) {
    return
  }
  if (event.key === 'Escape') {
    close()
  } else if (event.key === 'ArrowRight') {
    next()
  } else if (event.key === 'ArrowLeft') {
    previous()
  } else if (event.key === ' ') {
    event.preventDefault()
    autoplay.value = !autoplay.value
  }
  revealChromeTemporarily()
}

watch(() => props.modelValue, (value) => {
  if (!import.meta.client) {
    return
  }

  if (value) {
    activeIndex.value = clampIndex(props.initialIndex)
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeydown)
    preloadUpcomingImages()
    startAutoplay()
    showChrome.value = !autoplay.value
  } else {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKeydown)
    showSettings.value = false
    showChrome.value = true
    clearAutoplayTimer()
    clearIdleTimer()
  }
}, { immediate: true })

watch(() => props.initialIndex, (index) => {
  if (props.modelValue) {
    goTo(index)
  }
})

watch(activeIndex, preloadUpcomingImages)

watch([autoplay, intervalSeconds, total], () => {
  startAutoplay()
  if (props.modelValue) {
    if (autoplay.value) {
      hideChromeForPlayback()
    } else {
      clearIdleTimer()
      showChrome.value = true
    }
  }
})

watch(showSettings, (value) => {
  if (!value && autoplay.value) {
    hideChromeForPlayback()
  } else if (value) {
    showChrome.value = true
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKeydown)
  }
  clearAutoplayTimer()
  clearIdleTimer()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="immersive-fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[9999] overflow-hidden bg-black text-white"
        :class="{ 'cursor-none': !showChrome }"
        @pointermove="revealChromeTemporarily"
        @mousemove="revealChromeTemporarily"
        @click="revealChromeTemporarily"
        @touchstart.passive="revealChromeTemporarily"
      >
        <div
          class="pointer-events-none absolute inset-0 z-0 opacity-70"
          :style="{ backgroundImage: currentArtwork ? `radial-gradient(circle at 50% 38%, rgba(255,255,255,0.08), transparent 36%), linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.9))` : '' }"
        />

        <div class="relative z-10 flex min-h-screen flex-col">
          <div
            class="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-5 py-5 transition duration-300 md:px-10 md:py-8"
            :class="showChrome ? 'opacity-100' : 'opacity-0'"
          >
            <div :class="showChrome ? 'pointer-events-auto' : 'pointer-events-none'">
              <p class="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-white/42">{{ title }}</p>
              <p class="mt-2 text-xs font-bold tracking-[0.16em] text-white/42">{{ counter }}</p>
            </div>
            <div class="flex gap-2" :class="showChrome ? 'pointer-events-auto' : 'pointer-events-none'">
              <button class="immersive-control" type="button" @click="showSettings = !showSettings">设置</button>
              <button class="immersive-control" type="button" @click="close">退出</button>
            </div>
          </div>

          <main class="grid min-h-screen grid-rows-[1fr_auto] items-center px-4 pb-8 pt-20 md:px-10 md:pb-10">
            <div v-if="currentArtwork" class="mx-auto flex w-full max-w-7xl items-center justify-center">
              <button
                class="immersive-arrow left-4 md:left-8"
                type="button"
                :class="showChrome ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
                @click.stop="previous"
              >
                上一张
              </button>
              <img
                :key="currentArtwork.id"
                :src="currentArtwork.image_url"
                :alt="currentArtwork.title"
                decoding="async"
                fetchpriority="high"
                loading="eager"
                class="max-h-[68vh] max-w-full rounded-sm object-contain drop-shadow-[0_28px_70px_rgba(0,0,0,0.65)]"
              >
              <button
                class="immersive-arrow right-4 md:right-8"
                type="button"
                :class="showChrome ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
                @click.stop="next"
              >
                下一张
              </button>
            </div>

            <div v-else class="mx-auto max-w-xl text-center">
              <p class="text-sm font-bold text-white/50">暂无可播放作品</p>
            </div>

            <section
              v-if="currentArtwork"
              class="mx-auto mt-8 w-full max-w-3xl text-center transition duration-300"
            >
              <div class="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
                <h2 class="font-display text-3xl leading-none text-white md:text-5xl">{{ currentArtwork.title }}</h2>
                <span class="text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-white/40">{{ currentArtwork.owner_name }}</span>
              </div>
              <p class="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/58">
                {{ currentArtwork.prompt || currentArtwork.description || '作品说明暂未填写。' }}
              </p>
            </section>
          </main>
        </div>

        <div
          v-if="showSettings"
          class="fixed inset-0 z-30 grid place-items-center bg-black/62 px-4 backdrop-blur-sm"
          @click.self="showSettings = false"
        >
          <div class="w-full max-w-sm rounded-xl border border-white/10 bg-[#141416]/95 px-6 py-6 shadow-2xl">
            <h3 class="font-display text-2xl leading-none text-white">沉浸模式设置</h3>
            <div class="mt-6 space-y-4">
              <label class="flex items-center justify-between gap-4 border-b border-white/8 pb-4 text-sm font-bold text-white/68">
                自动播放
                <button class="immersive-control" type="button" @click="autoplay = !autoplay">{{ autoplay ? '开启' : '关闭' }}</button>
              </label>
              <div class="flex items-center justify-between gap-4 text-sm font-bold text-white/68">
                播放速度
                <div class="grid grid-cols-4 gap-1 rounded-lg border border-white/10 bg-black/22 p-1">
                  <button
                    v-for="seconds in [4, 6, 8, 12]"
                    :key="seconds"
                    type="button"
                    class="immersive-speed-option"
                    :class="intervalSeconds === seconds ? 'is-active' : ''"
                    @click="intervalSeconds = seconds"
                  >
                    {{ seconds }} 秒
                  </button>
                </div>
              </div>
            </div>
            <button class="immersive-control mt-6 w-full justify-center" type="button" @click="showSettings = false">关闭设置</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.immersive-fade-enter-active,
.immersive-fade-leave-active {
  transition: opacity 0.35s ease;
}

.immersive-fade-enter-from,
.immersive-fade-leave-to {
  opacity: 0;
}

.immersive-control,
.immersive-speed-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.07);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.82);
  transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
  backdrop-filter: blur(18px);
}

.immersive-control {
  padding: 0.55rem 0.9rem;
}

.immersive-control:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.13);
}

.immersive-speed-option {
  min-width: 2.8rem;
  padding: 0.5rem 0.62rem;
  border-color: transparent;
  background: transparent;
  color: rgba(255, 255, 255, 0.58);
  letter-spacing: 0;
}

.immersive-speed-option:hover {
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.86);
}

.immersive-speed-option.is-active {
  border-color: rgba(180, 218, 255, 0.38);
  background: rgba(180, 218, 255, 0.18);
  color: rgba(232, 244, 255, 0.96);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.immersive-arrow {
  position: fixed;
  top: 50%;
  z-index: 25;
  transform: translateY(-50%);
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.07);
  padding: 0.75rem 1rem;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.72);
  transition: opacity 0.25s ease, background 0.2s ease, transform 0.2s ease;
  backdrop-filter: blur(18px);
}

.immersive-arrow:hover {
  background: rgba(255, 255, 255, 0.13);
  transform: translateY(-50%) scale(1.02);
}

@media (max-width: 768px) {
  .immersive-arrow {
    top: auto;
    bottom: 1rem;
    transform: none;
  }

  .immersive-arrow:hover {
    transform: scale(1.02);
  }
}
</style>
