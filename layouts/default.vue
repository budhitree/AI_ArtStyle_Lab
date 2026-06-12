<script setup lang="ts">
const auth = useAuthStore()
</script>

<template>
  <div class="relative min-h-screen overflow-hidden">
    <div class="pointer-events-none fixed inset-0 -z-10 opacity-70">
      <div class="absolute left-[-8rem] top-[-10rem] h-96 w-96 rounded-full bg-ember/10 blur-3xl" />
      <div class="absolute right-[-8rem] top-20 h-96 w-96 rounded-full bg-forest/10 blur-3xl" />
    </div>
    <AppNav :profile="auth.profile" />
    <main class="pb-20 pt-28 md:pt-32">
      <slot />
    </main>
    <footer class="shell mt-12 pb-10 text-sm text-ink/55">
      <div class="border-t border-ink/10 py-7">
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p class="font-semibold text-ink">AI ArtStyle Lab · 校园 AI 艺术创作与展览平台</p>
          <p>Demo 回退与 Supabase 实装双模式</p>
        </div>
      </div>
    </footer>
  </div>
</template>
