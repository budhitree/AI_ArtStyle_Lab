<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { request } = useApi()
const maxUploadBytes = 12 * 1024 * 1024
const thumbnailMaxSide = 720

const file = ref<File | null>(null)
const thumbnailFile = ref<File | null>(null)
const preview = ref<string | null>(null)
const busy = ref(false)
const status = ref('')
const form = reactive({
  title: '',
  description: '',
  prompt: '',
  visibility: 'public' as 'public' | 'private'
})

const loadImage = async (url: string) => {
  const image = new Image()
  image.src = url
  try {
    await image.decode()
  } catch {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('图片读取失败'))
    })
  }
  return image
}

const createThumbnail = async (source: File) => {
  if (!import.meta.client || !source.type.startsWith('image/')) {
    return null
  }

  const objectUrl = URL.createObjectURL(source)
  try {
    const image = await loadImage(objectUrl)
    const scale = Math.min(1, thumbnailMaxSide / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) {
      return null
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.78)
    })
    if (!blob) {
      return null
    }

    const baseName = source.name.replace(/\.[^.]+$/, '') || 'artwork'
    return new File([blob], `${baseName}-thumb.webp`, { type: 'image/webp' })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

const onFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const selected = target.files?.[0]
  if (!selected) {
    return
  }

  if (selected.size > maxUploadBytes) {
    if (preview.value) {
      URL.revokeObjectURL(preview.value)
    }
    file.value = null
    thumbnailFile.value = null
    preview.value = null
    status.value = '图片不能超过 12MB，请先压缩后再上传。'
    target.value = ''
    return
  }

  if (preview.value) {
    URL.revokeObjectURL(preview.value)
  }

  file.value = selected
  try {
    thumbnailFile.value = await createThumbnail(selected)
  } catch {
    thumbnailFile.value = null
  }
  preview.value = URL.createObjectURL(selected)
  status.value = ''
}

const submit = async () => {
  if (!file.value) {
    status.value = '请先选择图片文件。'
    return
  }

  busy.value = true
  status.value = ''

  const data = new FormData()
  data.append('image', file.value)
  data.append('title', form.title)
  data.append('description', form.description)
  data.append('prompt', form.prompt)
  data.append('visibility', form.visibility)
  if (thumbnailFile.value) {
    data.append('thumbnail', thumbnailFile.value)
  }

  try {
    await request('/api/artworks/upload', {
      method: 'POST',
      body: data
    })
    status.value = '上传成功，作品已进入你的作品库。'
    file.value = null
    thumbnailFile.value = null
    if (preview.value) {
      URL.revokeObjectURL(preview.value)
    }
    preview.value = null
    form.title = ''
    form.description = ''
    form.prompt = ''
    form.visibility = 'public'
  } catch (error) {
    status.value = error instanceof Error ? error.message : '上传失败'
  } finally {
    busy.value = false
  }
}

onBeforeUnmount(() => {
  if (preview.value) {
    URL.revokeObjectURL(preview.value)
  }
})
</script>

<template>
  <div class="shell grid gap-5 md:grid-cols-[0.9fr_1.1fr] lg:gap-6">
    <section class="panel px-6 py-8 md:px-8">
      <SectionTitle
        kicker="上传作品"
        title="把课堂作品收进同一面作品墙。"
        description="上传页负责作品元信息、公开状态和图片存储，让手工创作与 AI 生成作品进入同一个管理流程。"
      />

      <div class="mt-8 grid gap-4">
        <label class="block rounded-[1.1rem] border border-dashed border-ink/25 bg-white/48 px-5 py-5">
          <span class="field-label">图片文件</span>
          <input class="mt-3 block w-full text-sm text-ink/60 file:mr-4 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-bold file:text-white" type="file" accept="image/*" @change="onFileChange">
        </label>
        <label class="block space-y-2">
          <span class="field-label">标题</span>
          <input v-model="form.title" class="field-input" type="text" placeholder="为作品命名">
        </label>
        <label class="block space-y-2">
          <span class="field-label">简介</span>
          <textarea v-model="form.description" class="field-input min-h-24" placeholder="写一点策展文字、课堂背景或作品说明" />
        </label>
        <label class="block space-y-2">
          <span class="field-label">Prompt / 灵感说明</span>
          <textarea v-model="form.prompt" class="field-input min-h-24" placeholder="如果这是 AI 图像，可补充生成提示词" />
        </label>
        <label class="block space-y-2">
          <span class="field-label">公开状态</span>
          <select v-model="form.visibility" class="field-input">
            <option value="public">公开展示</option>
            <option value="private">仅自己可见</option>
          </select>
        </label>
      </div>

      <div class="mt-8 flex flex-wrap gap-3">
        <button class="button-primary" :disabled="busy" @click="submit">
          {{ busy ? '上传中...' : '提交作品' }}
        </button>
      </div>

      <p v-if="status" class="mt-5 rounded-xl border border-ink/10 bg-white/70 px-4 py-3 text-sm font-semibold text-ink/70">{{ status }}</p>
    </section>

    <section class="panel studio-grid flex min-h-[32rem] items-center justify-center px-4 py-4 md:px-5 md:py-5 lg:min-h-[40rem] lg:px-6 lg:py-6">
      <div v-if="preview" class="w-full space-y-4">
        <div class="art-frame bg-white p-2">
          <img :src="preview" alt="作品上传预览" decoding="async" class="max-h-[36rem] w-full rounded-xl object-contain">
        </div>
        <p class="rounded-xl bg-white/70 px-4 py-3 text-sm text-ink/55">预览仅用于确认上传内容，最终公开状态由保存时的表单决定。</p>
      </div>
      <EmptyState
        v-else
        title="上传预览"
        description="选择文件后，这里会显示你即将提交到作品库的内容。"
      />
    </section>
  </div>
</template>
