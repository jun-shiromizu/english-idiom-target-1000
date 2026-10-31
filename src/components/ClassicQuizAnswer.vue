<template>
  <div class="classic-quiz-answer">
    <v-card class="mx-auto mb-4" max-width="700">
      <v-card-title class="text-body-2 text-medium-emphasis pt-4 pb-0">
        No.{{ item.number }}
      </v-card-title>
      <v-card-text class="classic-text">
        <template v-if="selectedExample">
          <section class="mb-4" aria-label="例文">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">例文</h3>
            <p class="text-body-1">{{ selectedExample.example.text }}</p>
          </section>

          <section class="mb-4" aria-label="現代語訳">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">現代語訳</h3>
            <p class="text-body-1">{{ selectedExample.example.translation }}</p>
          </section>

          <section class="mb-4" aria-label="該当する意味">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">該当する意味</h3>
            <p class="text-body-1">
              {{ selectedExample.mean.senseNumber }}. {{ selectedExample.mean.meaning }}
            </p>
          </section>
        </template>

        <section class="mb-4" aria-label="見出し語">
          <h3 class="text-subtitle-1 font-weight-bold mb-2">見出し語</h3>
          <p v-for="(word, index) in wordData.words" :key="index" class="text-body-1">
            {{ word }}
          </p>
        </section>

        <section class="mb-4" aria-label="意味">
          <h3 class="text-subtitle-1 font-weight-bold mb-2">意味</h3>
          <ul class="sense-list">
            <li v-for="(mean, meanIndex) in wordData.means" :key="meanIndex" class="mb-3">
              <p class="text-body-1">
                <span class="font-weight-bold">{{ mean.senseNumber }}.</span> {{ mean.meaning }}
              </p>
              <ul v-if="item.mode === 'idiom' && mean.examples.length" class="example-list mt-1">
                <li v-for="(example, exampleIndex) in mean.examples" :key="exampleIndex" class="mb-2">
                  <p class="text-body-1">{{ example.text }}</p>
                  <p class="text-body-2 text-medium-emphasis">{{ example.translation }}</p>
                </li>
              </ul>
            </li>
          </ul>
        </section>

        <section v-if="wordData.points.length" class="mb-4" aria-label="POINT">
          <h3 class="text-subtitle-1 font-weight-bold mb-2">POINT</h3>
          <ul class="pl-4">
            <li v-for="(point, index) in wordData.points" :key="index" class="text-body-2 mb-1">
              {{ point }}
            </li>
          </ul>
        </section>

        <section v-if="bookPages.length" class="mb-2" aria-label="出典ページ">
          <h3 class="text-subtitle-1 font-weight-bold mb-2">出典ページ</h3>
          <p class="text-body-2">{{ bookPages.map((page) => `p.${page}`).join('、') }}</p>
        </section>
      </v-card-text>
    </v-card>

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
import { computed } from 'vue'
import type { ClassicQuizItem, ClassicWordData } from '@/types'
import { getUniqueBookPages } from '@/utils/classicWordData'

const props = defineProps<{
  item: ClassicQuizItem
  wordData: ClassicWordData
}>()

const emit = defineEmits<{
  correct: []
  incorrect: []
}>()

const selectedExample = computed(() => {
  const { item, wordData } = props
  if (item.mode !== 'sentence') return null
  const mean = wordData.means[item.meanIndex]
  const example = mean?.examples[item.exampleIndex]
  return mean && example ? { mean, example } : null
})

const bookPages = computed(() => getUniqueBookPages(props.wordData))
</script>

<style scoped>
.gap-4 {
  gap: 16px;
}

.classic-text {
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.sense-list,
.example-list {
  list-style: none;
  padding-left: 0;
}

.example-list {
  padding-left: 16px;
  border-left: 2px solid rgba(var(--v-theme-on-surface), 0.12);
}
</style>
