<script setup lang="ts">
import type { Exhibition } from '~/shared/types'

const auth = useAuthStore()
const { request } = useApi()

const publicExhibitions = ref<Exhibition[]>([])
const myExhibitions = ref<Exhibition[]>([])
const status = ref('')

const form = reactive({
  title: '',
  description: '',
  cover_image_url: '/images/hero.png'
})

const load = async () => {
  publicExhibitions.value = await request<Exhibition[]>('/api/exhibitions')
  if (auth.isAuthenticated && ['teacher', 'admin'].includes(auth.role || '')) {
    myExhibitions.value = await request<Exhibition[]>('/api/exhibitions?scope=mine')
  }
}

await callOnce(load)

const createExhibition = async () => {
  try {
    const created = await request<Exhibition>('/api/exhibitions', {
      method: 'POST',
      body: {
        title: form.title,
        description: form.description,
        cover_image_url: form.cover_image_url,
        artwork_ids: []
      }
    })
    myExhibitions.value = [created, ...myExhibitions.value]
    status.value = '展览草稿已创建。'
    form.title = ''
    form.description = ''
  } catch (error) {
    status.value = error instanceof Error ? error.message : '创建失败'
  }
}
</script>

<template>
  <div class="shell space-y-12">
    <SectionTitle
      kicker="Exhibitions"
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
      <EmptyState
        v-else
        title="还没有公开展览"
        description="策展人发布第一场主题展览后，这里就会出现。"
      />
    </section>

    <section v-if="auth.isAuthenticated && ['teacher', 'admin'].includes(auth.role || '')" class="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
      <div class="panel studio-grid px-6 py-8 md:px-8">
        <p class="section-kicker">Create Exhibition</p>
        <h3 class="mt-4 font-display text-4xl leading-none">新建策展草稿</h3>
        <p class="mt-4 text-sm leading-7 text-ink/60">先搭建一个展厅壳，再进入详情页选择作品、调整叙事并发布。</p>
        <div class="mt-6 grid gap-4 rounded-[1.1rem] border border-ink/10 bg-white/55 p-4">
          <input v-model="form.title" class="field-input" type="text" placeholder="展览标题">
          <textarea v-model="form.description" class="field-input min-h-24" placeholder="展览描述" />
          <input v-model="form.cover_image_url" class="field-input" type="text" placeholder="/images/hero.png 或 Storage 公网地址">
          <button class="button-primary" @click="createExhibition">创建草稿</button>
        </div>
        <p v-if="status" class="mt-4 rounded-xl border border-ink/10 bg-white/70 px-4 py-3 text-sm font-semibold text-ink/70">{{ status }}</p>
      </div>

      <div class="space-y-4">
        <p class="section-kicker">Your Drafts</p>
        <div v-if="myExhibitions.length" class="grid gap-5">
          <ExhibitionCard
            v-for="exhibition in myExhibitions"
            :key="exhibition.id"
            :exhibition="exhibition"
          />
        </div>
        <EmptyState
          v-else
          title="你还没有策展草稿"
          description="创建后的草稿会出现在这里，点进去继续编排作品和发布。"
        />
      </div>
    </section>
  </div>
</template>
