<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <div class="muted-panel studio-grid flex min-h-56 flex-col items-start justify-end gap-4 px-6 py-6">
    <span class="grid h-10 w-10 place-items-center rounded-full border border-ink/10 bg-white/70 text-sm font-extrabold text-ember">空</span>
    <div>
      <p class="section-kicker">暂无内容</p>
      <h3 class="mt-3 font-display text-3xl">{{ title }}</h3>
      <p class="mt-3 max-w-xl text-sm leading-7 text-ink/60">{{ description }}</p>
    </div>
  </div>
</template>
