<template>
  <section v-if="htmlList.length" class="supplement-content">
    <h3 class="text-subtitle-1 font-weight-bold mb-2">補足資料</h3>
    <v-divider class="mb-3" />
    <div
      v-for="(html, idx) in htmlList"
      :key="idx"
      class="supplement-item mb-4"
      v-html="html"
    />
  </section>
</template>

<script setup lang="ts">
defineProps<{
  htmlList: string[]
}>()
</script>

<style scoped>
.supplement-item :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.supplement-item :deep(h3) {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.supplement-item :deep(p) {
  margin-bottom: 0.5rem;
  line-height: 1.7;
}
</style>
