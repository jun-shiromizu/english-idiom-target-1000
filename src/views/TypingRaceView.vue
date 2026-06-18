<template>
  <v-container class="py-6" max-width="760">
    <div v-if="!session" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <template v-else-if="raceFinished">
      <div class="text-center mb-6">
        <p class="text-overline text-medium-emphasis mb-2">Typing Race</p>
        <h1 class="text-h4 font-weight-bold">60秒チャレンジ結果</h1>
      </div>

      <v-card class="race-score-card mb-5" color="primary" variant="tonal">
        <v-card-text class="py-8 text-center">
          <p class="text-h2 font-weight-bold">{{ correctCount }}</p>
          <p class="text-h6">正解した例文</p>
          <p class="text-body-1 mt-3">
            {{ attemptedCount }} 文に挑戦 / 正答率 {{ accuracy }}%
          </p>
        </v-card-text>
      </v-card>

      <v-card variant="outlined" class="mb-5">
        <v-list>
          <v-list-item title="制限時間">
            <template #prepend>
              <v-icon color="warning">mdi-timer-outline</v-icon>
            </template>
            <template #append>
              <span class="font-weight-bold">{{ timeLimitSeconds }} 秒</span>
            </template>
          </v-list-item>
          <v-divider />
          <v-list-item title="正解数">
            <template #prepend>
              <v-icon color="success">mdi-check-circle-outline</v-icon>
            </template>
            <template #append>
              <span class="font-weight-bold text-success">{{ correctCount }} 文</span>
            </template>
          </v-list-item>
          <v-divider />
          <v-list-item title="ミス">
            <template #prepend>
              <v-icon color="error">mdi-close-circle-outline</v-icon>
            </template>
            <template #append>
              <span class="font-weight-bold text-error">{{ attemptedCount - correctCount }} 文</span>
            </template>
          </v-list-item>
        </v-list>
      </v-card>

      <v-row>
        <v-col cols="12" md="6">
          <v-btn block color="primary" variant="elevated" size="large" @click="restartRace">
            <v-icon start>mdi-refresh</v-icon>
            もう一度挑戦
          </v-btn>
        </v-col>
        <v-col cols="12" md="6">
          <v-btn block variant="outlined" size="large" @click="goHome">
            <v-icon start>mdi-home</v-icon>
            トップページへ
          </v-btn>
        </v-col>
      </v-row>
    </template>

    <template v-else>
      <div class="race-header mb-4">
        <div class="race-header__stats">
          <v-chip color="warning" variant="tonal" size="large">
            <v-icon start>mdi-timer-sand</v-icon>
            残り {{ remainingSeconds }} 秒
          </v-chip>
          <v-chip color="success" variant="tonal">
            <v-icon start>mdi-check</v-icon>
            {{ correctCount }} 正解
          </v-chip>
          <v-chip variant="outlined">
            <v-icon start>mdi-target</v-icon>
            {{ attemptedCount }} 挑戦
          </v-chip>
        </div>
        <v-btn variant="text" size="small" @click="showQuitDialog = true">中断</v-btn>
      </div>

      <v-card class="race-card" variant="elevated">
        <v-card-text class="pa-6 pa-sm-8">
          <div class="text-overline text-medium-emphasis mb-3">
            表示された英文をそのまま入力
          </div>
          <p class="race-sentence mb-6">
            {{ currentItem.questionText }}
          </p>

          <v-text-field
            ref="inputRef"
            v-model="userInput"
            label="例文を入力"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            autofocus
            @keydown.enter.prevent="submitCurrent"
          />

          <div class="race-actions mt-4">
            <v-btn
              color="primary"
              variant="elevated"
              size="large"
              :disabled="userInput.trim().length === 0"
              @click="submitCurrent"
            >
              採点して次へ
            </v-btn>
          </div>

          <v-alert
            v-if="lastOutcome"
            class="mt-4"
            :type="lastOutcome === 'correct' ? 'success' : 'error'"
            variant="tonal"
          >
            {{ lastOutcome === 'correct' ? '正解です。' : '不正解です。次の例文へ進みます。' }}
          </v-alert>
        </v-card-text>
      </v-card>
    </template>
  </v-container>

  <v-dialog v-model="showQuitDialog" max-width="360">
    <v-card>
      <v-card-title>タイピングレースを中断しますか？</v-card-title>
      <v-card-text>残り時間を含めて進捗は保存されます。あとで再開できます。</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="showQuitDialog = false">続ける</v-btn>
        <v-btn color="primary" variant="elevated" @click="quitSession">トップへ</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useHistory } from '@/composables/useHistory'
import { useQuizSession } from '@/composables/useQuizSession'
import type { QuizSession } from '@/types'

type RaceOutcome = 'correct' | 'incorrect' | null

const DEFAULT_TIME_LIMIT_SECONDS = 60

const router = useRouter()
const { loadSession, saveSession, clearSession } = useQuizSession()
const { setResult } = useHistory()

const session = ref<QuizSession | null>(null)
const userInput = ref('')
const remainingSeconds = ref(DEFAULT_TIME_LIMIT_SECONDS)
const raceFinished = ref(false)
const lastOutcome = ref<RaceOutcome>(null)
const showQuitDialog = ref(false)
const inputRef = ref()

let timerId: number | null = null

const currentIndex = computed(() => session.value?.currentIndex ?? 0)
const currentItem = computed(() => session.value!.items[currentIndex.value])
const timeLimitSeconds = computed(() => session.value?.timeLimitSeconds ?? DEFAULT_TIME_LIMIT_SECONDS)
const attemptedCount = computed(() => (session.value ? Object.keys(session.value.results).length : 0))
const correctCount = computed(() => {
  if (!session.value) return 0
  return Object.values(session.value.results).filter(Boolean).length
})
const accuracy = computed(() =>
  attemptedCount.value === 0 ? 0 : Math.round((correctCount.value / attemptedCount.value) * 100),
)

function normalizeTypingText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function stopTimer() {
  if (timerId !== null) {
    window.clearInterval(timerId)
    timerId = null
  }
}

function syncRemainingSeconds() {
  if (!session.value?.endsAt) return

  const secondsLeft = Math.max(0, Math.ceil((session.value.endsAt - Date.now()) / 1000))
  remainingSeconds.value = secondsLeft

  if (secondsLeft === 0) {
    finishRace()
  }
}

function startTimer() {
  stopTimer()
  syncRemainingSeconds()
  if (raceFinished.value) return

  timerId = window.setInterval(() => {
    syncRemainingSeconds()
  }, 250)
}

function finishRace() {
  if (raceFinished.value) return

  raceFinished.value = true
  stopTimer()
  saveCurrentSession()
}

function saveCurrentSession() {
  if (!session.value) return
  saveSession(session.value)
}

function focusInput() {
  inputRef.value?.focus?.()
}

function submitCurrent() {
  if (!session.value || raceFinished.value || userInput.value.trim().length === 0) return

  const item = currentItem.value
  const meanIndex = item.meanIndex ?? 0
  const totalMeans = item.idiomData.means.length
  const answer = item.idiomData.means[meanIndex]?.['example-sentence'] ?? item.questionText
  const correct = normalizeTypingText(userInput.value) === normalizeTypingText(answer)

  setResult(
    session.value.settings.bookId,
    item.number,
    meanIndex,
    totalMeans,
    correct,
    'sentence',
    'en-to-ja',
  )
  session.value.results[currentIndex.value] = correct
  lastOutcome.value = correct ? 'correct' : 'incorrect'
  userInput.value = ''

  const nextIndex = currentIndex.value + 1
  session.value.currentIndex = nextIndex
  saveCurrentSession()

  if (nextIndex >= session.value.items.length) {
    finishRace()
    return
  }

  focusInput()
}

function restartRace() {
  if (!session.value) return

  const nextEndsAt = Date.now() + timeLimitSeconds.value * 1000
  session.value = {
    ...session.value,
    currentIndex: 0,
    results: {},
    endsAt: nextEndsAt,
  }
  userInput.value = ''
  lastOutcome.value = null
  remainingSeconds.value = timeLimitSeconds.value
  raceFinished.value = false
  saveCurrentSession()
  startTimer()
  focusInput()
}

function quitSession() {
  saveCurrentSession()
  router.push({ name: 'home' })
}

function goHome() {
  clearSession()
  router.push({ name: 'home' })
}

onMounted(() => {
  const loaded = loadSession()
  if (!loaded || loaded.sessionType !== 'typing-race') {
    router.replace({ name: 'home' })
    return
  }

  const normalizedSession: QuizSession = {
    ...loaded,
    timeLimitSeconds: loaded.timeLimitSeconds ?? DEFAULT_TIME_LIMIT_SECONDS,
    endsAt: loaded.endsAt ?? Date.now() + (loaded.timeLimitSeconds ?? DEFAULT_TIME_LIMIT_SECONDS) * 1000,
  }

  session.value = normalizedSession

  if (normalizedSession.currentIndex >= normalizedSession.items.length) {
    remainingSeconds.value = Math.max(
      0,
      Math.ceil(((normalizedSession.endsAt ?? Date.now()) - Date.now()) / 1000),
    )
    raceFinished.value = true
    saveCurrentSession()
    return
  }

  startTimer()
  focusInput()
})

onBeforeUnmount(() => {
  stopTimer()
})
</script>

<style scoped>
.race-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.race-header__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.race-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  background:
    radial-gradient(circle at top right, rgba(var(--v-theme-primary), 0.12), transparent 30%),
    linear-gradient(180deg, rgba(var(--v-theme-primary), 0.04), transparent 45%),
    rgb(var(--v-theme-surface));
}

.race-score-card {
  border: 1px solid rgba(var(--v-theme-primary), 0.16);
}

.race-sentence {
  font-size: clamp(1.5rem, 3.5vw, 2.3rem);
  line-height: 1.45;
  letter-spacing: 0.01em;
}

.race-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 600px) {
  .race-header {
    flex-direction: column;
  }

  .race-actions .v-btn {
    width: 100%;
  }
}
</style>
