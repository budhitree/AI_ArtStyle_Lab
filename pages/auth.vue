<script setup lang="ts">
import type { AuthPayload } from '~/shared/types'
import { inferRoleFromAccountCode, normalizeAccountCode } from '~/shared/account'
import { roleLabel } from '~/shared/labels'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const mode = ref<'login' | 'register'>('login')
const form = reactive<AuthPayload>({
  account_code: '',
  password: '',
  name: '',
  role: 'student'
})
const busy = ref(false)
const errorMessage = ref('')
const inferredRole = computed(() => inferRoleFromAccountCode(normalizeAccountCode(form.account_code)))

const submit = async () => {
  busy.value = true
  errorMessage.value = ''
  try {
    if (mode.value === 'login') {
      await auth.signIn(form)
    } else {
      await auth.signUp(form)
    }
    await router.push(typeof route.query.redirect === 'string' ? route.query.redirect : '/')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '认证失败'
  } finally {
    busy.value = false
  }
}

</script>

<template>
  <div class="shell grid gap-5 md:grid-cols-[0.95fr_1.05fr] lg:gap-6">
    <section class="panel studio-grid px-6 py-8 md:px-10 md:py-10">
      <p class="section-kicker">账号入口</p>
      <h1 class="mt-4 font-display text-4xl leading-none lg:text-5xl">进入校园艺术实验室</h1>
      <p class="mt-5 max-w-xl text-base leading-8 text-ink/64">
        学生和教师可以在这里进入个人作品库、上传作品、参与 AI 创作与主题展览管理。
      </p>

      <div class="mt-8 grid gap-4 rounded-[1rem] border border-ink/10 bg-white/64 px-5 py-5 text-sm leading-7 text-ink/64">
        <div>
          <p class="font-semibold text-ink">学号或工号直接登录</p>
          <p class="mt-1">学生使用 8 位学号，如 20250101；教师使用 7 位工号，如 2506049。</p>
        </div>
        <div>
          <p class="font-semibold text-ink">注册时自动识别身份</p>
          <p class="mt-1">8 位编号进入学生账号，7 位编号进入教师账号；邮箱只在后台保存。</p>
        </div>
      </div>
    </section>

    <section class="panel px-6 py-8 md:px-10 md:py-10">
      <div class="flex gap-2">
        <button
          class="rounded-full px-4 py-2 text-sm font-extrabold transition"
          :class="mode === 'login' ? 'bg-ink text-white' : 'bg-black/5 text-ink/70'"
          @click="mode = 'login'"
        >
          登录
        </button>
        <button
          class="rounded-full px-4 py-2 text-sm font-extrabold transition"
          :class="mode === 'register' ? 'bg-ink text-white' : 'bg-black/5 text-ink/70'"
          @click="mode = 'register'"
        >
          注册
        </button>
      </div>

      <div class="mt-8 space-y-5">
        <label class="block space-y-2">
          <span class="field-label">学号 / 工号</span>
          <input
            v-model="form.account_code"
            class="field-input"
            type="text"
            inputmode="numeric"
            autocomplete="username"
            placeholder="如 20250101 或 2506049"
          >
          <span v-if="mode === 'register' && inferredRole" class="block text-xs font-semibold text-ink/55">
            将创建{{ roleLabel[inferredRole] }}账号
          </span>
        </label>

        <label v-if="mode === 'register'" class="block space-y-2">
          <span class="field-label">姓名</span>
          <input v-model="form.name" class="field-input" type="text" placeholder="输入展示名称">
        </label>

        <label class="block space-y-2">
          <span class="field-label">密码</span>
          <input v-model="form.password" class="field-input" type="password" placeholder="请输入密码">
        </label>

        <p v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {{ errorMessage }}
        </p>

        <button class="button-primary w-full" :disabled="busy" @click="submit">
          {{ busy ? '处理中...' : mode === 'login' ? '进入工作台' : '创建账号' }}
        </button>
      </div>
    </section>
  </div>
</template>
