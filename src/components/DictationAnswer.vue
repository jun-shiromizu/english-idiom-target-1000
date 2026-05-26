<template>
  <div class="dictation-answer">
    <!-- 判定結果 -->
    <v-alert
      :type="isCorrect ? 'success' : 'error'"
      variant="tonal"
      class="mb-4"
    >
      <div class="d-flex align-center flex-wrap gap-2">
        <v-icon>{{ isCorrect ? 'mdi-check-circle' : 'mdi-close-circle' }}</v-icon>
        <span class="font-weight-bold">{{ isCorrect ? '正解' : '不正解' }}</span>
        <span class="text-body-2">
          あなたの回答：<strong>{{ userInput || '（未入力）' }}</strong>
        </span>
      </div>
    </v-alert>

    <!-- 回答内容 -->
    <v-card class="mx-auto mb-4" max-width="700">
      <v-card-title class="text-body-2 text-medium-emphasis pt-4 pb-0">
        No.{{ item.number }}
      </v-card-title>
      <v-card-text>
        <section class="mb-4">
          <h3 class="text-subtitle-1 font-weight-bold mb-2">英単語／英熟語</h3>
          <p v-for="idiom in item.idiomData.idioms" :key="idiom" class="text-body-1">
            {{ idiom }}
          </p>
        </section>

        <section class="mb-4">
          <h3 class="text-subtitle-1 font-weight-bold mb-2">意味</h3>
          <ol class="pl-4">
            <li v-for="(mean, idx) in item.idiomData.means" :key="idx" class="mb-2">
              <span>{{ mean['idiom-jp'] }}</span>
              <span v-if="mean.synonyms?.length" class="text-body-2 text-medium-emphasis ml-2">
                (同義語: {{ mean.synonyms.join(', ') }})
              </span>
            </li>
          </ol>
        </section>

        <section class="mb-4">
          <h3 class="text-subtitle-1 font-weight-bold mb-2">例文</h3>
          <ol class="pl-4">
            <li v-for="(mean, idx) in item.idiomData.means" :key="idx" class="mb-3">
              <p class="text-body-1">{{ mean['example-sentence'] }}</p>
              <p class="text-body-2 text-medium-emphasis">{{ mean['sentence-jp'] }}</p>
            </li>
          </ol>
        </section>

        <section v-if="item.idiomData.notes.length" class="mb-4">
          <h3 class="text-subtitle-1 font-weight-bold mb-2">補足説明</h3>
          <ul class="pl-4">
            <li v-for="(note, idx) in item.idiomData.notes" :key="idx" class="text-body-2">
              {{ note }}
            </li>
          </ul>
        </section>

        <SupplementContent :number="item.number" />
      </v-card-text>
    </v-card>

    <!-- 次の問題へ / 結果を見る -->
    <div class="d-flex justify-center mt-2">
      <v-btn
        ref="nextButton"
        color="primary"
        variant="elevated"
        size="large"
        min-width="180"
        @click="emit('next')"
      >
        <v-icon start>{{ isLast ? 'mdi-flag-checkered' : 'mdi-arrow-right' }}</v-icon>
        {{ isLast ? '結果を見る' : '次の問題へ' }}
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type { QuizItem } from '@/types'
import SupplementContent from './SupplementContent.vue'

defineProps<{
  item: QuizItem
  userInput: string
  isCorrect: boolean
  isLast: boolean
}>()

const emit = defineEmits<{
  next: []
}>()

const nextButton = ref<{ focus?: () => void; $el?: HTMLElement } | null>(null)
let focusTimerId: number | null = null

function focusNextButton() {
  nextButton.value?.focus?.()

  const root = nextButton.value?.$el
  if (root && document.activeElement !== root) {
    const target = root.matches('button') ? root : root.querySelector('button')
    ;(target as HTMLElement | null)?.focus()
  }
}

onMounted(() => {
  // Enter キーで解答確定した直後の誤クリックを防ぐため、次のタスクでフォーカスする
  focusTimerId = window.setTimeout(focusNextButton, 0)
})

onUnmounted(() => {
  if (focusTimerId !== null) {
    clearTimeout(focusTimerId)
  }
})
</script>
