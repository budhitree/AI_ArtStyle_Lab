<script setup lang="ts">
const auth = useAuthStore()
</script>

<template>
  <div class="relative min-h-screen overflow-hidden">
    <AppNav :profile="auth.profile" />
    <main class="pb-20 pt-28 md:pt-32">
      <slot />
    </main>
    <footer class="shell mt-12 pb-10 text-sm text-ink/55">
      <div class="border-t border-ink/10 py-7">
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p class="font-semibold text-ink">AI ArtStyle Lab · 校园 AI 艺术创作与展览平台</p>
          <p>作品上传、AI 创作与主题策展</p>
        </div>
      </div>
    </footer>
  </div>
</template>
