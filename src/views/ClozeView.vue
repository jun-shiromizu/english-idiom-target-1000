<template>
  <v-container class="py-4" max-width="700">
    <div v-if="!session" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <template v-else>
      <div class="d-flex align-center justify-space-between mb-4">
        <ProgressBar :current="currentIndex + 1" :total="session.items.length" class="flex-grow-1 mr-4" />
        <v-btn variant="text" size="small" @click="showQuitDialog = true">中断</v-btn>
      </div>

      <ClozeQuestion
        v-if="!revealed"
        :key="currentIndex"
        :question-text="currentCloze.maskedText"
        :sentence-jp="currentSentenceJp"
        :choices="currentCloze.choices"
        @submit="onSubmit"
      />

      <DictationAnswer
        v-else
        :item="currentItem"
        :user-input="userInput"
        :is-correct="isCorrect"
        :is-last="currentIndex + 1 >= session.items.length"
        response-label="あなたの選択"
        empty-label="（未選択）"
        @next="onNext"
      />
    </template>
  </v-container>

  <v-dialog v-model="showQuitDialog" max-width="360">
    <v-card>
      <v-card-title>セッションを中断しますか？</v-card-title>
      <v-card-text>進捗は保存されています。あとで再開できます。</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="showQuitDialog = false">続ける</v-btn>
        <v-btn color="primary" variant="elevated" @click="quitSession">トップへ</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ProgressBar from '@/components/ProgressBar.vue'
import ClozeQuestion from '@/components/ClozeQuestion.vue'
import DictationAnswer from '@/components/DictationAnswer.vue'
import { useQuizSession } from '@/composables/useQuizSession'
import { useHistory } from '@/composables/useHistory'
import type { QuizSession } from '@/types'

const router = useRouter()
const { loadSession, saveSession } = useQuizSession()
const { setResult } = useHistory()

const session = ref<QuizSession | null>(null)
const revealed = ref(false)
const userInput = ref('')
const showQuitDialog = ref(false)

const currentIndex = computed(() => session.value?.currentIndex ?? 0)
const currentItem = computed(() => session.value!.items[currentIndex.value])
const currentCloze = computed(() => currentItem.value.cloze!)
const currentSentenceJp = computed(() => {
  const meanIndex = currentItem.value.meanIndex ?? 0
  return currentItem.value.idiomData.means[meanIndex]?.['sentence-jp'] ?? ''
})
const correctAnswer = computed(() => currentCloze.value.answerSurface)
const isCorrect = computed(
  () => userInput.value.trim() === correctAnswer.value.trim(),
)

onMounted(() => {
  const loaded = loadSession()
  if (
    !loaded ||
    loaded.sessionType !== 'cloze' ||
    loaded.items.length === 0 ||
    loaded.items.some((item) => !item.cloze)
  ) {
    router.replace({ name: 'home' })
    return
  }
  session.value = loaded
})

function onSubmit(value: string) {
  userInput.value = value
  revealed.value = true
}

function onNext() {
  if (!session.value) return
  const item = currentItem.value
  const totalIdioms =
    item.meanIndex !== undefined ? item.idiomData.means.length : item.idiomData.idioms.length
  const index = item.meanIndex !== undefined ? item.meanIndex : item.idiomIndex

  setResult(
    session.value.settings.bookId,
    item.number,
    index,
    totalIdioms,
    isCorrect.value,
    session.value.settings.mode,
    session.value.settings.direction,
  )
  session.value.results[currentIndex.value] = isCorrect.value

  const nextIndex = currentIndex.value + 1
  if (nextIndex >= session.value.items.length) {
    saveSession(session.value)
    router.push({ name: 'result' })
  } else {
    session.value.currentIndex = nextIndex
    saveSession(session.value)
    revealed.value = false
    userInput.value = ''
  }
}

function quitSession() {
  if (session.value) saveSession(session.value)
  router.push({ name: 'home' })
}
</script>
