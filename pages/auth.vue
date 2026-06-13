<script setup lang="ts">
import type { AuthPayload } from '~/shared/types'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const mode = ref<'login' | 'register'>('login')
const form = reactive<AuthPayload>({
  email: '',
  password: '',
  name: '',
  role: 'student'
})
const busy = ref(false)
const errorMessage = ref('')

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
  <div class="shell grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
    <section class="panel studio-grid px-6 py-8 md:px-10 md:py-10">
      <p class="section-kicker">账号入口</p>
      <h1 class="mt-4 font-display text-5xl leading-none">进入校园艺术实验室</h1>
      <p class="mt-5 max-w-xl text-base leading-8 text-ink/64">
        学生和教师可以在这里进入个人作品库、上传作品、参与 AI 创作与主题展览管理。
      </p>

      <div class="mt-8 grid gap-4 rounded-[1rem] border border-ink/10 bg-white/64 px-5 py-5 text-sm leading-7 text-ink/64">
        <div>
          <p class="font-semibold text-ink">旧账号可直接登录</p>
          <p class="mt-1">原系统里的学号、教师账号或管理员账号可以继续使用，密码保持不变。</p>
        </div>
        <div>
          <p class="font-semibold text-ink">新用户默认学生身份</p>
          <p class="mt-1">注册后会进入学生作品空间；教师和管理员权限由后台统一维护。</p>
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
          <span class="field-label">{{ mode === 'login' ? '账号或邮箱' : '邮箱' }}</span>
          <input
            v-model="form.email"
            class="field-input"
            :type="mode === 'login' ? 'text' : 'email'"
            :placeholder="mode === 'login' ? '学号 / 旧账号 / 邮箱' : 'student@school.edu'"
          >
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
