<script setup lang="ts">
defineProps<{
  kicker: string
  title: string
  description: string
}>()
</script>

<template>
  <div class="space-y-4">
    <p class="section-kicker">{{ kicker }}</p>
    <h2 class="display-title max-w-4xl text-balance">{{ title }}</h2>
    <p class="max-w-2xl text-base leading-8 text-ink/60 lg:text-lg">
      {{ description }}
    </p>
  </div>
</template>
