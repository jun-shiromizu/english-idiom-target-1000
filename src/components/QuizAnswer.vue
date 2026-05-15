<template>
  <div class="quiz-answer">
    <!-- 回答内容 -->
    <v-card class="mx-auto mb-4" max-width="700">
      <v-card-title class="text-body-2 text-medium-emphasis pt-4 pb-0">
        No.{{ item.number }}
      </v-card-title>
      <v-card-text>
        <!-- 熟語モード -->
        <template v-if="item.meanIndex === undefined">
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
        </template>

        <!-- 例文モード -->
        <template v-else>
          <section class="mb-4">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">例文</h3>
            <p class="text-body-1">{{ item.idiomData.means[item.meanIndex]['example-sentence'] }}</p>
          </section>

          <section class="mb-4">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">例文訳</h3>
            <p class="text-body-1">{{ item.idiomData.means[item.meanIndex]['sentence-jp'] }}</p>
          </section>

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
        </template>

        <!-- 補足説明 (notes) -->
        <section v-if="item.idiomData.notes.length" class="mb-4">
          <h3 class="text-subtitle-1 font-weight-bold mb-2">補足説明</h3>
          <ul class="pl-4">
            <li v-for="(note, idx) in item.idiomData.notes" :key="idx" class="text-body-2">
              {{ note }}
            </li>
          </ul>
        </section>

        <!-- 補足データ (Markdown→HTML) -->
        <SupplementContent :number="item.number" />
      </v-card-text>
    </v-card>

    <!-- 正解/不正解ボタン -->
    <div class="d-flex justify-center gap-4 mt-2">
      <v-btn
        color="error"
        variant="outlined"
        size="large"
        min-width="140"
        @click="emit('incorrect')"
      >
        <v-icon start>mdi-close</v-icon>
        不正解
      </v-btn>
      <v-btn
        color="success"
        variant="elevated"
        size="large"
        min-width="140"
        @click="emit('correct')"
      >
        <v-icon start>mdi-check</v-icon>
        正解
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { QuizItem } from '@/types'
import SupplementContent from './SupplementContent.vue'

defineProps<{
  item: QuizItem
}>()

const emit = defineEmits<{
  correct: []
  incorrect: []
}>()
</script>

<style scoped>
.gap-4 {
  gap: 16px;
}
</style>
