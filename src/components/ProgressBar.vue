<template>
  <div class="progress-bar-wrapper">
    <div class="d-flex justify-space-between align-center mb-1">
      <span class="text-body-2 text-medium-emphasis">{{ current }} / {{ total }}問目</span>
      <span class="text-body-2 text-medium-emphasis">{{ Math.round((current / total) * 100) }}%</span>
    </div>
    <v-progress-linear
      :model-value="(current / total) * 100"
      color="primary"
      rounded
      height="8"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  current: number
  total: number
}>()
</script>
