<script setup lang="ts">
import type { Exhibition } from '~/shared/types'

const auth = useAuthStore()
const { request } = useApi()

const publicExhibitions = ref<Exhibition[]>([])
const myExhibitions = ref<Exhibition[]>([])
const status = ref('')
const publicPageSize = 6
const myPageSize = 6
const publicBusy = ref(false)
const myBusy = ref(false)
const hasMorePublic = ref(false)
const hasMoreMine = ref(false)

const form = reactive({
  title: '',
  description: '',
  cover_image_url: '' as string | null
})

const loadPublic = async (reset = false) => {
  if (publicBusy.value) {
    return
  }

  publicBusy.value = true
  try {
    if (reset) {
      publicExhibitions.value = []
    }

    const next = await request<Exhibition[]>('/api/exhibitions', {
      query: {
        limit: publicPageSize + 1,
        offset: publicExhibitions.value.length
      }
    })
    publicExhibitions.value = [...publicExhibitions.value, ...next.slice(0, publicPageSize)]
    hasMorePublic.value = next.length > publicPageSize
  } finally {
    publicBusy.value = false
  }
}

const loadMine = async (reset = false) => {
  if (!auth.isAuthenticated || !['teacher', 'admin'].includes(auth.role || '')) {
    myExhibitions.value = []
    hasMoreMine.value = false
    return
  }

  if (myBusy.value) {
    return
  }

  myBusy.value = true
  try {
    if (reset) {
      myExhibitions.value = []
    }

    const next = await request<Exhibition[]>('/api/exhibitions', {
      query: {
        scope: 'mine',
        limit: myPageSize + 1,
        offset: myExhibitions.value.length
      }
    })
    myExhibitions.value = [...myExhibitions.value, ...next.slice(0, myPageSize)]
    hasMoreMine.value = next.length > myPageSize
  } finally {
    myBusy.value = false
  }
}

const load = async () => {
  await Promise.all([loadPublic(true), loadMine(true)])
}

await callOnce(load)

if (import.meta.client) {
  onMounted(async () => {
    if (!auth.initialized) {
      await auth.initialize()
    }
    await loadMine(true)
  })
}

watch(() => auth.profile?.id, () => {
  if (import.meta.client) {
    loadMine(true)
  }
})

const createExhibition = async () => {
  try {
    const created = await request<Exhibition>('/api/exhibitions', {
      method: 'POST',
      body: {
        title: form.title,
        description: form.description,
        cover_image_url: form.cover_image_url || null,
        artwork_ids: []
      }
    })
    myExhibitions.value = [created, ...myExhibitions.value]
    status.value = '展览草稿已创建。'
    form.title = ''
    form.description = ''
    form.cover_image_url = ''
  } catch (error) {
    status.value = error instanceof Error ? error.message : '创建失败'
  }
}
</script>

<template>
  <div class="shell space-y-12">
    <SectionTitle
      kicker="主题展览"
      title="把作品组织成有叙事的线上展厅。"
      description="首页只显示发布中的展览；教师和管理员登录后，还能在这里创建和管理自己的策展草稿。"
    />

    <section class="space-y-6">
      <div v-if="publicExhibitions.length" class="grid gap-6 lg:grid-cols-2">
        <ExhibitionCard
          v-for="exhibition in publicExhibitions"
          :key="exhibition.id"
          :exhibition="exhibition"
        />
      </div>
      <div v-if="hasMorePublic" class="flex justify-center">
        <button class="button-secondary" :disabled="publicBusy" @click="loadPublic()">
          {{ publicBusy ? '加载中...' : '加载更多展览' }}
        </button>
      </div>
      <EmptyState
        v-if="!publicExhibitions.length && !publicBusy"
        title="还没有公开展览"
        description="策展人发布第一场主题展览后，这里就会出现。"
      />
    </section>

    <section v-if="auth.isAuthenticated && ['teacher', 'admin'].includes(auth.role || '')" class="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
      <div class="panel studio-grid px-6 py-8 md:px-8">
        <p class="section-kicker">新建展览</p>
        <h3 class="mt-4 font-display text-4xl leading-none">新建策展草稿</h3>
        <p class="mt-4 text-sm leading-7 text-ink/60">先搭建一个展厅壳，再进入详情页选择作品、调整叙事并发布。</p>
        <div class="mt-6 grid gap-4 rounded-[1.1rem] border border-ink/10 bg-white/55 p-4">
          <input v-model="form.title" class="field-input" type="text" placeholder="展览标题">
          <textarea v-model="form.description" class="field-input min-h-24" placeholder="展览描述" />
          <input v-model="form.cover_image_url" class="field-input" type="text" placeholder="封面图片地址，可留空">
          <button class="button-primary" @click="createExhibition">创建草稿</button>
        </div>
        <p v-if="status" class="mt-4 rounded-xl border border-ink/10 bg-white/70 px-4 py-3 text-sm font-semibold text-ink/70">{{ status }}</p>
      </div>

      <div class="space-y-4">
        <p class="section-kicker">我的草稿</p>
        <div v-if="myExhibitions.length" class="grid gap-5">
          <ExhibitionCard
            v-for="exhibition in myExhibitions"
            :key="exhibition.id"
            :exhibition="exhibition"
          />
        </div>
        <div v-if="hasMoreMine" class="flex justify-center">
          <button class="button-secondary" :disabled="myBusy" @click="loadMine()">
            {{ myBusy ? '加载中...' : '加载更多草稿' }}
          </button>
        </div>
        <EmptyState
          v-if="!myExhibitions.length && !myBusy"
          title="你还没有策展草稿"
          description="创建后的草稿会出现在这里，点进去继续编排作品和发布。"
        />
      </div>
    </section>
  </div>
</template>
