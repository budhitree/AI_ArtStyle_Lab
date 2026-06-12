<script setup lang="ts">
import type { AuthPayload, UserRole } from '~/shared/types'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { isDemoMode } = useRuntimeMode()

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

const fillDemo = (role: UserRole) => {
  form.email = `${role}@artstyle.lab`
  form.password = 'demo-password'
  form.role = role
  form.name = role === 'student' ? '沈知遥' : role === 'teacher' ? '林策' : '馆务管理员'
}
</script>

<template>
  <div class="shell grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
    <section class="panel studio-grid px-6 py-8 md:px-10 md:py-10">
      <p class="section-kicker">Authentication</p>
      <h1 class="mt-4 font-display text-5xl leading-none">进入校园艺术实验室</h1>
      <p class="mt-5 max-w-xl text-base leading-8 text-ink/64">
        正式环境使用 Supabase Auth。若当前未配置 Supabase，会自动进入 demo 回退模式，方便先预览完整站点和业务流。
      </p>

      <div class="mt-8 grid gap-3 md:grid-cols-3">
        <button class="rounded-[1rem] border border-ink/10 bg-white/72 px-4 py-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:bg-white" @click="fillDemo('student')">
          <span class="section-kicker">Student</span>
          <span class="mt-3 block font-display text-2xl">Demo 学生</span>
        </button>
        <button class="rounded-[1rem] border border-ink/10 bg-white/72 px-4 py-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:bg-white" @click="fillDemo('teacher')">
          <span class="section-kicker">Teacher</span>
          <span class="mt-3 block font-display text-2xl">Demo 教师</span>
        </button>
        <button class="rounded-[1rem] border border-ink/10 bg-white/72 px-4 py-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:bg-white" @click="fillDemo('admin')">
          <span class="section-kicker">Admin</span>
          <span class="mt-3 block font-display text-2xl">Demo 管理员</span>
        </button>
      </div>

      <div class="mt-8 rounded-[1rem] border border-ink/10 bg-white/60 px-5 py-5 text-sm leading-7 text-ink/64">
        <p class="font-semibold text-ink">当前模式：{{ isDemoMode ? 'Demo 回退' : 'Supabase 正式连接' }}</p>
        <p class="mt-2">如果你现在只想先看站点结构，直接点击上面的 demo 快捷入口即可。</p>
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
          <span class="field-label">邮箱</span>
          <input v-model="form.email" class="field-input" type="email" placeholder="student@school.edu">
        </label>

        <label v-if="mode === 'register'" class="block space-y-2">
          <span class="field-label">姓名</span>
          <input v-model="form.name" class="field-input" type="text" placeholder="输入展示名称">
        </label>

        <label v-if="mode === 'register'" class="block space-y-2">
          <span class="field-label">角色</span>
          <select v-model="form.role" class="field-input">
            <option value="student">学生</option>
            <option value="teacher">教师</option>
            <option value="admin">管理员</option>
          </select>
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
