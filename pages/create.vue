<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

import type { AiGeneration, AiResult } from '~/shared/types'

const { request } = useApi()

const form = reactive({
  subject: '',
  background: '',
  style: '',
  details: '',
  ratio: '1:1' as '1:1' | '16:9' | '9:16'
})

const busy = ref(false)
const saveBusy = ref(false)
const status = ref('')
const results = ref<AiResult[]>([])
const selectedImage = ref<AiResult | null>(null)
const saveVisibility = ref<'public' | 'private'>('public')
const history = ref<AiGeneration[]>([])
const historyBusy = ref(false)

const loadHistory = async () => {
  historyBusy.value = true
  try {
    history.value = await request<AiGeneration[]>('/api/ai/generations', {
      query: { limit: 20 }
    })
  } finally {
    historyBusy.value = false
  }
}

const generate = async () => {
  busy.value = true
  status.value = ''
  try {
    results.value = await request<AiResult[]>('/api/ai/generate', {
      method: 'POST',
      body: form
    })
    selectedImage.value = results.value[0] || null
    await loadHistory()
  } catch (error) {
    status.value = error instanceof Error ? error.message : '生成失败'
  } finally {
    busy.value = false
  }
}

const saveToGallery = async () => {
  if (!selectedImage.value) {
    return
  }
  saveBusy.value = true
  status.value = ''
  try {
    await request('/api/artworks/from-ai', {
      method: 'POST',
      body: {
        title: form.subject || 'AI 作品',
        description: `${form.background} / ${form.style}`.trim(),
        prompt: selectedImage.value.prompt,
        imageUrl: selectedImage.value.url,
        visibility: saveVisibility.value
      }
    })
    status.value = '已保存到作品库。'
  } catch (error) {
    status.value = error instanceof Error ? error.message : '保存失败'
  } finally {
    saveBusy.value = false
  }
}

const downloadSelected = async () => {
  if (!selectedImage.value || !import.meta.client) {
    return
  }
  const link = document.createElement('a')
  link.href = selectedImage.value.url
  link.download = `${form.subject || 'ai-artwork'}.jpg`
  link.click()
}

const restoreHistory = (item: AiGeneration) => {
  results.value = item.result_images
  selectedImage.value = item.result_images[0] || null
  form.subject = item.params.subject || form.subject
  form.background = item.params.background || ''
  form.style = item.params.style || ''
  form.details = item.params.details || ''
  form.ratio = item.params.ratio || '1:1'
  status.value = '已载入历史生成结果。'
}

onMounted(() => {
  void loadHistory()
})
</script>

<template>
  <div class="shell grid gap-5 md:grid-cols-[0.82fr_1.18fr] lg:gap-6">
    <section class="panel px-6 py-8 md:px-8">
      <SectionTitle
        kicker="AI 创作"
        title="把想法拆成可生成的视觉线索。"
        description="主体、背景、风格和补充说明会被重新拼装成更适合生成的 Prompt，结果可以下载或直接进入作品库。"
      />

      <div class="mt-8 grid gap-4">
        <label class="block space-y-2">
          <span class="field-label">主体</span>
          <textarea v-model="form.subject" class="field-input min-h-24" placeholder="例如：一间漂浮在夜空里的图书馆" />
        </label>
        <label class="block space-y-2">
          <span class="field-label">背景</span>
          <textarea v-model="form.background" class="field-input min-h-24" placeholder="例如：玻璃穹顶、雾气、长廊、低饱和光线" />
        </label>
        <label class="block space-y-2">
          <span class="field-label">风格</span>
          <input v-model="form.style" class="field-input" type="text" placeholder="例如：博物馆级摄影、纸张肌理、未来主义">
        </label>
        <label class="block space-y-2">
          <span class="field-label">补充</span>
          <textarea v-model="form.details" class="field-input min-h-24" placeholder="例如：柔和侧光、特写、展墙留白、戏剧性对比" />
        </label>
        <label class="block space-y-2">
          <span class="field-label">比例</span>
          <select v-model="form.ratio" class="field-input">
            <option value="1:1">1:1 方形</option>
            <option value="16:9">16:9 横幅</option>
            <option value="9:16">9:16 竖幅</option>
          </select>
        </label>
      </div>

      <div class="mt-8 grid gap-3 sm:grid-cols-3">
        <button class="button-primary" :disabled="busy" @click="generate">
          {{ busy ? '生成中...' : '开始生成' }}
        </button>
        <button class="button-secondary" :disabled="!selectedImage" @click="downloadSelected">
          下载所选图片
        </button>
        <button class="button-secondary" :disabled="!selectedImage || saveBusy" @click="saveToGallery">
          {{ saveBusy ? '保存中...' : '保存到作品库' }}
        </button>
      </div>

      <label class="mt-5 block space-y-2">
        <span class="field-label">保存公开状态</span>
        <select v-model="saveVisibility" class="field-input">
          <option value="public">公开展示</option>
          <option value="private">仅自己可见</option>
        </select>
      </label>

      <p v-if="status" class="mt-5 rounded-xl border border-ink/10 bg-white/70 px-4 py-3 text-sm font-semibold text-ink/70">
        {{ status }}
      </p>

      <div class="mt-8 border-t border-ink/10 pt-6">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="section-kicker">生成历史</p>
            <h2 class="mt-2 font-display text-2xl">最近生成</h2>
          </div>
          <button class="button-secondary" :disabled="historyBusy" @click="loadHistory">
            {{ historyBusy ? '刷新中...' : '刷新' }}
          </button>
        </div>
        <div v-if="history.length" class="mt-4 grid gap-3">
          <button
            v-for="item in history"
            :key="item.id"
            class="rounded-xl border border-ink/10 bg-white/65 px-4 py-3 text-left transition hover:border-ink/25 hover:bg-white"
            @click="restoreHistory(item)"
          >
            <p class="line-clamp-2 text-sm font-semibold leading-6 text-ink/75">{{ item.prompt }}</p>
            <p class="mt-1 text-xs text-ink/45">{{ new Date(item.created_at).toLocaleString() }} · {{ item.result_images.length }} 张</p>
          </button>
        </div>
        <p v-else class="mt-4 rounded-xl bg-white/60 px-4 py-3 text-sm text-ink/50">
          暂无生成历史。
        </p>
      </div>
    </section>

    <section class="panel studio-grid min-h-[34rem] px-4 py-4 md:px-5 md:py-5 lg:min-h-[42rem] lg:px-6 lg:py-6">
      <div class="mb-5 flex flex-col gap-3 border-b border-ink/10 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="section-kicker">生成结果</p>
          <h2 class="mt-2 font-display text-4xl">生成结果</h2>
        </div>
        <p class="max-w-sm text-sm leading-6 text-ink/50">点击作品确定当前选择，再下载或保存到作品库。</p>
      </div>
      <div v-if="results.length" class="grid gap-3 md:grid-cols-2 lg:gap-4">
        <button
          v-for="result in results"
          :key="result.id"
          class="group overflow-hidden rounded-[1.1rem] border bg-white/80 p-2 text-left shadow-soft transition"
          :class="selectedImage?.id === result.id ? 'border-ember ring-4 ring-ember/10' : 'border-ink/10 hover:border-ink/25'"
          @click="selectedImage = result"
        >
          <img :src="result.url" :alt="result.prompt" class="aspect-square w-full rounded-xl object-cover transition duration-500 group-hover:scale-[1.02]">
          <div class="px-3 py-4">
            <p class="line-clamp-3 text-sm leading-7 text-ink/62">{{ result.prompt }}</p>
          </div>
        </button>
      </div>
      <EmptyState
        v-else
        title="生成结果会出现在这里"
        description="提交生成后，系统会在这里展示可下载或保存入库的图片。"
      />
    </section>
  </div>
</template>
