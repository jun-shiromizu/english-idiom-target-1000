<template>
  <section v-if="html" class="supplement-content">
    <h3 class="text-subtitle-1 font-weight-bold mb-2">補足資料</h3>
    <v-divider class="mb-3" />
    <div
      class="supplement-item mb-4"
      v-html="html"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { BookId } from '@/types'
import { useGitHubData } from '@/composables/useGitHubData'

const props = defineProps<{
  bookId?: BookId
  number: string
}>()

const { fetchSupplementHtml } = useGitHubData()
const html = ref<string | null>(null)
let requestId = 0

watch(
  () => [props.bookId, props.number] as const,
  async ([bookId, number]) => {
    const currentRequestId = ++requestId
    html.value = null
    if (!bookId) return
    try {
      const nextHtml = await fetchSupplementHtml(bookId, number)
      if (currentRequestId === requestId) {
        html.value = nextHtml
      }
    } catch (e) {
      console.warn('Failed to fetch supplement:', e)
    }
  },
  { immediate: true },
)
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
