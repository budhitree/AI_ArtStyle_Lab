<script setup lang="ts">
import type { Profile } from '~/shared/types'
import { roleLabel } from '~/shared/labels'

const props = defineProps<{
  profile: Profile | null
}>()

const auth = useAuthStore()
const route = useRoute()
const open = ref(false)

const links = [
  { to: '/', label: '公共画廊' },
  { to: '/create', label: 'AI 创作' },
  { to: '/upload', label: '上传作品' },
  { to: '/my-works', label: '我的作品' },
  { to: '/exhibitions', label: '主题展览' }
]

watch(() => route.path, () => {
  open.value = false
})
</script>

<template>
  <header class="fixed inset-x-0 top-0 z-50">
    <div class="shell pt-3 md:pt-4">
      <div class="border border-ink/10 bg-[rgba(255,252,244,0.9)] px-3 py-3 shadow-soft backdrop-blur-xl md:rounded-full md:px-4 lg:px-5">
        <div class="flex items-center justify-between gap-3">
        <NuxtLink to="/" class="flex min-w-0 items-center gap-3">
          <div class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink font-display text-base text-white shadow-soft lg:h-11 lg:w-11 lg:text-lg">AI</div>
          <div>
            <p class="font-display text-xl leading-none lg:text-2xl">ArtStyle Lab</p>
            <p class="mt-1 hidden text-[0.65rem] font-bold text-ink/45 lg:block">校园艺术创作平台</p>
          </div>
        </NuxtLink>

        <nav class="hidden items-center gap-0.5 md:flex lg:gap-1">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="rounded-full px-2.5 py-2 text-xs font-extrabold transition lg:px-4 lg:text-sm"
            :class="route.path === link.to ? 'bg-ink text-white shadow-soft' : 'text-ink/62 hover:bg-ink/5 hover:text-ink'"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>

        <div class="flex items-center gap-3">
          <div v-if="props.profile" class="hidden text-right xl:block">
            <p class="text-sm font-semibold">{{ props.profile.name }}</p>
            <p class="text-[0.65rem] font-bold text-ink/45">{{ props.profile.account_code }} · {{ roleLabel[props.profile.role] }}</p>
          </div>
          <button
            v-if="props.profile"
            class="button-secondary hidden md:inline-flex"
            @click="auth.signOut()"
          >
            退出
          </button>
          <NuxtLink v-else to="/auth" class="button-primary hidden md:inline-flex">
            登录 / 注册
          </NuxtLink>
          <button class="button-secondary px-4 md:hidden" aria-label="打开导航" @click="open = !open">
            {{ open ? '关闭' : '菜单' }}
          </button>
        </div>
        </div>

        <div v-if="open" class="grid gap-3 border-t border-ink/10 pt-4 md:hidden">
          <nav class="grid gap-2">
            <NuxtLink
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              class="rounded-xl px-4 py-3 text-sm font-extrabold"
              :class="route.path === link.to ? 'bg-ink text-white' : 'bg-white/65 text-ink/70'"
            >
              {{ link.label }}
            </NuxtLink>
          </nav>
          <div class="flex items-center justify-between gap-3 rounded-xl bg-white/65 px-4 py-3">
            <div v-if="props.profile">
              <p class="text-sm font-bold">{{ props.profile.name }}</p>
              <p class="text-xs text-ink/45">{{ props.profile.account_code }} · {{ roleLabel[props.profile.role] }}</p>
            </div>
            <p v-else class="text-sm font-bold text-ink/65">未登录</p>
            <button v-if="props.profile" class="button-secondary px-4 py-2" @click="auth.signOut()">退出</button>
            <NuxtLink v-else to="/auth" class="button-primary px-4 py-2">登录 / 注册</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
