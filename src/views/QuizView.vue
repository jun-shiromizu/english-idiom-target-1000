<template>
  <v-container class="py-4" max-width="700">
    <!-- ローディング -->
    <div v-if="!session" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <template v-else>
      <!-- ヘッダー: 進捗 + 中断ボタン -->
      <div class="d-flex align-center justify-space-between mb-4">
        <ProgressBar :current="currentIndex + 1" :total="session.items.length" class="flex-grow-1 mr-4" />
        <v-btn variant="text" size="small" @click="showQuitDialog = true">中断</v-btn>
      </div>

      <!-- 問題表示フェーズ -->
      <QuizQuestion
        v-if="!revealed"
        :question-text="currentItem.questionText"
        @reveal="revealed = true"
      />

      <!-- 回答表示フェーズ（スワイプ対応ラッパー） -->
      <div
        v-else
        @touchstart="onTouchStart"
        @touchend="onTouchEnd"
      >
        <QuizAnswer
          :item="currentItem"
          @correct="onJudge(true)"
          @incorrect="onJudge(false)"
        />
      </div>
    </template>
  </v-container>

  <!-- 中断確認ダイアログ -->
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ProgressBar from '@/components/ProgressBar.vue'
import QuizQuestion from '@/components/QuizQuestion.vue'
import QuizAnswer from '@/components/QuizAnswer.vue'
import { useQuizSession } from '@/composables/useQuizSession'
import { useHistory } from '@/composables/useHistory'
import type { QuizSession } from '@/types'

const router = useRouter()
const { loadSession, saveSession, clearSession } = useQuizSession()
const { setResult } = useHistory()

const session = ref<QuizSession | null>(null)
const revealed = ref(false)
const showQuitDialog = ref(false)
let touchStartX = 0

const currentIndex = computed(() => session.value?.currentIndex ?? 0)
const currentItem = computed(() => session.value!.items[currentIndex.value])

onMounted(() => {
  const loaded = loadSession()
  if (!loaded) {
    router.replace({ name: 'home' })
    return
  }
  session.value = loaded
})

function onJudge(correct: boolean) {
  if (!session.value) return
  const item = currentItem.value
  const totalIdioms = item.meanIndex !== undefined
    ? item.idiomData.means.length
    : item.idiomData.idioms.length
  const index = item.meanIndex !== undefined ? item.meanIndex : item.idiomIndex

  setResult(item.number, index, totalIdioms, correct)
  session.value.results[currentIndex.value] = correct

  const nextIndex = currentIndex.value + 1
  if (nextIndex >= session.value.items.length) {
    // 全問終了 → 結果画面へ
    saveSession(session.value)
    router.push({ name: 'result' })
  } else {
    session.value.currentIndex = nextIndex
    saveSession(session.value)
    revealed.value = false
  }
}

function onTouchStart(e: TouchEvent) {
  touchStartX = e.touches[0].clientX
}

function onTouchEnd(e: TouchEvent) {
  const diff = e.changedTouches[0].clientX - touchStartX
  if (diff > 50) onJudge(true)
  else if (diff < -50) onJudge(false)
}

function quitSession() {
  if (session.value) saveSession(session.value)
  router.push({ name: 'home' })
}
</script>
