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
        :hint="questionHint"
        :preserve-line-breaks="isClassic"
        @reveal="revealed = true"
      />

      <!-- 回答表示フェーズ（スワイプ対応ラッパー） -->
      <div
        v-else
        class="swipe-zone"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @touchcancel="resetTouch"
      >
        <div class="swipe-feedback swipe-feedback-incorrect" :style="{ opacity: incorrectFeedbackOpacity }">
          <v-icon size="32">mdi-close-circle-outline</v-icon>
          <span>不正解</span>
        </div>
        <div class="swipe-feedback swipe-feedback-correct" :style="{ opacity: correctFeedbackOpacity }">
          <v-icon size="32">mdi-check-circle-outline</v-icon>
          <span>正解</span>
        </div>

        <div
          class="swipe-card"
          :class="{ 'is-dragging': isSwipeActive }"
          :style="swipeCardStyle"
        >
          <ClassicQuizAnswer
            v-if="classicItem && classicWordData"
            :item="classicItem"
            :word-data="classicWordData"
            @correct="onJudge(true)"
            @incorrect="onJudge(false)"
          />
          <QuizAnswer
            v-else-if="englishItem"
            :item="englishItem"
            @correct="onJudge(true)"
            @incorrect="onJudge(false)"
          />
        </div>
      </div>

      <v-alert v-if="saveErrorMessage" type="error" variant="tonal" class="mt-4">
        {{ saveErrorMessage }}
      </v-alert>
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
import ClassicQuizAnswer from '@/components/ClassicQuizAnswer.vue'
import { useQuizSession } from '@/composables/useQuizSession'
import { useHistory } from '@/composables/useHistory'
import { useAppNotice } from '@/composables/useAppNotice'
import { isClassicQuizSession } from '@/utils/classicSession'
import { INVALID_CLASSIC_SESSION_REDIRECT_NOTICE } from '@/utils/routeGuards'
import type { ClassicQuizSession, QuizSession } from '@/types'

const router = useRouter()
const { loadStoredSession, saveSession } = useQuizSession()
const { setResult, setClassicResult } = useHistory()
const { setNotice } = useAppNotice()

const session = ref<QuizSession | ClassicQuizSession | null>(null)
const revealed = ref(false)
const showQuitDialog = ref(false)
const saveErrorMessage = ref('')
let touchStartX: number | null = null
let touchStartY: number | null = null
const swipeOffsetX = ref(0)
const isSwipeActive = ref(false)

const SWIPE_MIN_X = 120
const SWIPE_MAX_Y = 40
const SWIPE_MIN_XY_RATIO = 3
const SWIPE_ACTIVATE_X = 24
const SWIPE_ACTIVATE_XY_RATIO = 1.5
const SWIPE_MAX_OFFSET = 160

const currentIndex = computed(() => session.value?.currentIndex ?? 0)
const currentItem = computed(() => session.value!.items[currentIndex.value])
const isClassic = computed(() => session.value !== null && isClassicQuizSession(session.value))
const classicItem = computed(() =>
  session.value && isClassicQuizSession(session.value) ? session.value.items[currentIndex.value] : null,
)
const classicWordData = computed(() =>
  session.value && isClassicQuizSession(session.value) && classicItem.value
    ? session.value.words[classicItem.value.number] ?? null
    : null,
)
const englishItem = computed(() =>
  session.value && !isClassicQuizSession(session.value) ? session.value.items[currentIndex.value] : null,
)
const questionHint = computed(() => {
  if (classicItem.value?.mode !== 'idiom' || !classicWordData.value) return undefined
  const meanCount = classicWordData.value.means.length
  return meanCount > 1 ? `意味を${meanCount}つ答えてください` : undefined
})
const swipeProgress = computed(() => Math.min(Math.abs(swipeOffsetX.value) / SWIPE_MIN_X, 1))
const correctFeedbackOpacity = computed(() => (swipeOffsetX.value > 0 ? swipeProgress.value : 0))
const incorrectFeedbackOpacity = computed(() => (swipeOffsetX.value < 0 ? swipeProgress.value : 0))
const swipeCardStyle = computed(() => ({
  transform: `translate3d(${swipeOffsetX.value}px, 0, 0) rotate(${swipeOffsetX.value / 18}deg)`,
}))

onMounted(() => {
  const stored = loadStoredSession()
  if (stored.kind === 'invalid-classic') {
    setNotice(INVALID_CLASSIC_SESSION_REDIRECT_NOTICE)
    router.replace({ name: 'home' })
    return
  }
  if (stored.kind === 'classic') {
    session.value = stored.session
    return
  }
  if (stored.kind !== 'english') {
    router.replace({ name: 'home' })
    return
  }
  const loaded = stored.session
  if (loaded.sessionType === 'dictation') {
    router.replace({ name: 'dictation' })
    return
  }
  if (loaded.sessionType === 'cloze') {
    router.replace({ name: 'cloze' })
    return
  }
  if (loaded.sessionType === 'typing-race') {
    router.replace({ name: 'typing-race' })
    return
  }
  session.value = loaded
})

function recordHistory(activeSession: QuizSession | ClassicQuizSession, correct: boolean) {
  if (isClassicQuizSession(activeSession)) {
    setClassicResult(activeSession.items[activeSession.currentIndex].historyKey, correct)
    return
  }

  const item = activeSession.items[activeSession.currentIndex]
  const totalIdioms = item.meanIndex !== undefined
    ? item.idiomData.means.length
    : item.idiomData.idioms.length
  const index = item.meanIndex !== undefined ? item.meanIndex : item.idiomIndex

  setResult(
    activeSession.settings.bookId,
    item.number,
    index,
    totalIdioms,
    correct,
    activeSession.settings.mode,
    activeSession.settings.direction,
  )
}

function onJudge(correct: boolean) {
  if (!session.value) return
  const activeSession = session.value
  const index = currentIndex.value
  const hadResult = Object.prototype.hasOwnProperty.call(activeSession.results, index)
  const previousResult = activeSession.results[index]
  const nextIndex = index + 1
  const isFinished = nextIndex >= activeSession.items.length

  try {
    recordHistory(activeSession, correct)
    activeSession.results[index] = correct
    if (!isFinished) activeSession.currentIndex = nextIndex
    saveSession(activeSession)
  } catch (error) {
    // 保存に失敗した場合は、成功したように次へ進めない
    if (hadResult) activeSession.results[index] = previousResult
    else delete activeSession.results[index]
    activeSession.currentIndex = index
    saveErrorMessage.value = '回答結果を保存できませんでした。ブラウザの保存容量を確認してから、もう一度判定してください。'
    console.error(error)
    return
  }

  saveErrorMessage.value = ''
  if (isFinished) {
    router.push({ name: 'result' })
  } else {
    revealed.value = false
  }
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) {
    resetTouch()
    return
  }
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}

function onTouchMove(e: TouchEvent) {
  if (touchStartX === null || touchStartY === null || e.touches.length !== 1) return

  const touch = e.touches[0]
  const diffX = touch.clientX - touchStartX
  const diffY = touch.clientY - touchStartY
  const absX = Math.abs(diffX)
  const absY = Math.abs(diffY)

  if (!isSwipeActive.value) {
    if (absX < SWIPE_ACTIVATE_X) return
    if (absX / Math.max(absY, 1) < SWIPE_ACTIVATE_XY_RATIO) return
    isSwipeActive.value = true
  }

  if (e.cancelable) e.preventDefault()
  swipeOffsetX.value = Math.max(-SWIPE_MAX_OFFSET, Math.min(SWIPE_MAX_OFFSET, diffX))
}

function onTouchEnd(e: TouchEvent) {
  if (touchStartX === null || touchStartY === null) return

  const touch = e.changedTouches[0]
  const diffX = touch.clientX - touchStartX
  const diffY = touch.clientY - touchStartY
  const absX = Math.abs(diffX)
  const absY = Math.abs(diffY)
  const wasSwipeActive = isSwipeActive.value

  resetTouch()

  if (absX < SWIPE_MIN_X) return
  // 横スワイプとして確定済みなら、指の弧による縦ブレは許容する
  if (!wasSwipeActive) {
    if (absY > SWIPE_MAX_Y) return
    if (absX / Math.max(absY, 1) < SWIPE_MIN_XY_RATIO) return
  }

  if (diffX > 0) onJudge(true)
  else onJudge(false)
}

function resetTouch() {
  touchStartX = null
  touchStartY = null
  swipeOffsetX.value = 0
  isSwipeActive.value = false
}

function quitSession() {
  if (session.value) {
    try {
      saveSession(session.value)
    } catch (error) {
      showQuitDialog.value = false
      saveErrorMessage.value = '進捗を保存できませんでした。ブラウザの保存容量を確認してください。'
      console.error(error)
      return
    }
  }
  router.push({ name: 'home' })
}
</script>

<style scoped>
.swipe-zone {
  position: relative;
  overflow: hidden;
  touch-action: pan-y;
}

.swipe-card {
  position: relative;
  z-index: 1;
  transition: transform 180ms ease;
  will-change: transform;
}

.swipe-card.is-dragging {
  transition: none;
}

.swipe-feedback {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 96px);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(var(--v-theme-surface), 0.9);
  border: 2px solid currentColor;
  border-radius: 8px;
  font-weight: 700;
  pointer-events: none;
  transition: opacity 120ms ease;
}

.swipe-feedback-correct {
  right: max(16px, calc((100vw - 700px) / 2 + 16px));
  color: rgb(var(--v-theme-success));
}

.swipe-feedback-incorrect {
  left: max(16px, calc((100vw - 700px) / 2 + 16px));
  color: rgb(var(--v-theme-error));
}

@media (min-width: 700px) {
  .swipe-feedback {
    top: 88px;
  }
}
</style>
