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
          <p class="text-h2 font-weight-bold">{{ correctCharCount }}</p>
          <p class="text-h6">正解した文字数</p>
          <p class="text-body-1 mt-3">
            ミスタイプ {{ mistypedCharCount }} 文字
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
          <v-list-item title="正解した文字数">
            <template #prepend>
              <v-icon color="success">mdi-check-circle-outline</v-icon>
            </template>
            <template #append>
              <span class="font-weight-bold text-success">{{ correctCharCount }} 文字</span>
            </template>
          </v-list-item>
          <v-divider />
          <v-list-item title="ミスタイプ">
            <template #prepend>
              <v-icon color="error">mdi-close-circle-outline</v-icon>
            </template>
            <template #append>
              <span class="font-weight-bold text-error">{{ mistypedCharCount }} 文字</span>
            </template>
          </v-list-item>
          <v-divider />
          <v-list-item title="今回進んだ位置">
            <template #prepend>
              <v-icon color="info">mdi-format-list-numbered</v-icon>
            </template>
            <template #append>
              <span class="font-weight-bold">{{ currentIndex }} / {{ session.items.length }} 文</span>
            </template>
          </v-list-item>
        </v-list>
      </v-card>

      <v-row>
        <v-col v-if="canContinueRace" cols="12" md="6">
          <v-btn block color="primary" variant="elevated" size="large" @click="continueRace">
            <v-icon start>mdi-refresh</v-icon>
            続ける
          </v-btn>
        </v-col>
        <v-col cols="12" :md="canContinueRace ? 6 : 12">
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
          <v-chip
            color="success"
            variant="tonal"
            :class="{ 'race-chip--celebrate': successEffectActive }"
          >
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

      <v-card
        class="race-card"
        :class="{ 'race-card--celebrate': successEffectActive }"
        variant="elevated"
      >
        <v-card-text class="pa-6 pa-sm-8">
          <div class="text-overline text-medium-emphasis mb-3">
            表示された英文をそのまま入力
          </div>
          <p class="race-translation text-body-2 text-medium-emphasis mb-2">
            {{ currentTranslation }}
          </p>
          <p class="race-sentence mb-6">
            {{ currentItem.questionText }}
          </p>
          <p class="race-progress mb-4" aria-hidden="true">
            <span class="race-progress__typed">{{ typedPrefix }}</span><span>{{ remainingSuffix }}</span>
          </p>

          <v-text-field
            ref="inputRef"
            v-model="userInput"
            label="例文を入力"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            autofocus
            @input="onNativeInput"
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
const SUCCESS_EFFECT_DURATION_MS = 520

const router = useRouter()
const { loadSession, saveSession, clearSession } = useQuizSession()
const { setResult } = useHistory()

const session = ref<QuizSession | null>(null)
const userInput = ref('')
const remainingSeconds = ref(DEFAULT_TIME_LIMIT_SECONDS)
const raceFinished = ref(false)
const raceFinishedReason = ref<'timeup' | 'completed' | null>(null)
const lastOutcome = ref<RaceOutcome>(null)
const showQuitDialog = ref(false)
const inputRef = ref()
const successEffectActive = ref(false)

let timerId: number | null = null
let successEffectTimerId: number | null = null
let audioContext: AudioContext | null = null

const currentIndex = computed(() => session.value?.currentIndex ?? 0)
const currentItem = computed(() => session.value!.items[currentIndex.value])
const currentTranslation = computed(() => {
  const meanIndex = currentItem.value.meanIndex ?? 0
  return currentItem.value.idiomData.means[meanIndex]?.['sentence-jp'] ?? ''
})
const typedPrefix = computed(() => userInput.value)
const remainingSuffix = computed(() => getExpectedSentence().slice(userInput.value.length))
const timeLimitSeconds = computed(() => session.value?.timeLimitSeconds ?? DEFAULT_TIME_LIMIT_SECONDS)
const attemptedCount = computed(() => (session.value ? Object.keys(session.value.results).length : 0))
const correctCharCount = computed(() => session.value?.typingRaceStats?.correctChars ?? 0)
const mistypedCharCount = computed(() => session.value?.typingRaceStats?.mistypedChars ?? 0)
const correctCount = computed(() => {
  if (!session.value) return 0
  return Object.values(session.value.results).filter(Boolean).length
})
const canContinueRace = computed(
  () => raceFinishedReason.value === 'timeup' && currentIndex.value < (session.value?.items.length ?? 0),
)

function normalizeTypingText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function getExpectedSentence(): string {
  const item = currentItem.value
  const meanIndex = item.meanIndex ?? 0
  return item.idiomData.means[meanIndex]?.['example-sentence'] ?? item.questionText
}

function findValidPrefix(input: string, expected: string): string {
  const trimmed = input.slice(0, expected.length)
  for (let length = trimmed.length; length >= 0; length -= 1) {
    const candidate = trimmed.slice(0, length)
    if (expected.startsWith(candidate)) {
      return candidate
    }
  }
  return ''
}

function ensureTypingRaceStats() {
  if (!session.value) return
  session.value.typingRaceStats ??= {
    correctChars: 0,
    mistypedChars: 0,
  }
}

function onNativeInput(event: Event) {
  if (!session.value || raceFinished.value) return

  const target = event.target
  if (!(target instanceof HTMLInputElement)) return

  const rawValue = target.value
  const nextValue = findValidPrefix(rawValue, getExpectedSentence())
  const rejectedCount = Math.max(rawValue.length - nextValue.length, 0)
  if (rejectedCount > 0) {
    ensureTypingRaceStats()
    session.value.typingRaceStats!.mistypedChars += rejectedCount
    saveCurrentSession()
  }
  userInput.value = nextValue

  if (target.value !== nextValue) {
    target.value = nextValue
  }
}

function stopTimer() {
  if (timerId !== null) {
    window.clearInterval(timerId)
    timerId = null
  }
}

function stopSuccessEffect() {
  if (successEffectTimerId !== null) {
    window.clearTimeout(successEffectTimerId)
    successEffectTimerId = null
  }
  successEffectActive.value = false
}

function playSuccessSound() {
  if (typeof window === 'undefined') return

  const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) return

  try {
    audioContext ??= new AudioContextCtor()
    if (audioContext.state === 'suspended') {
      void audioContext.resume()
    }

    const now = audioContext.currentTime
    const gain = audioContext.createGain()
    gain.connect(audioContext.destination)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)

    const lowOsc = audioContext.createOscillator()
    lowOsc.type = 'square'
    lowOsc.frequency.setValueAtTime(320, now)
    lowOsc.frequency.exponentialRampToValueAtTime(540, now + 0.08)
    lowOsc.connect(gain)

    const highOsc = audioContext.createOscillator()
    highOsc.type = 'triangle'
    highOsc.frequency.setValueAtTime(760, now)
    highOsc.frequency.exponentialRampToValueAtTime(1180, now + 0.1)
    highOsc.connect(gain)

    lowOsc.start(now)
    highOsc.start(now)
    lowOsc.stop(now + 0.16)
    highOsc.stop(now + 0.14)
  } catch {
    // Audio feedback is optional.
  }
}

function triggerSuccessEffect() {
  stopSuccessEffect()
  successEffectActive.value = true
  playSuccessSound()
  successEffectTimerId = window.setTimeout(() => {
    successEffectActive.value = false
    successEffectTimerId = null
  }, SUCCESS_EFFECT_DURATION_MS)
}

function syncRemainingSeconds() {
  if (!session.value?.endsAt) return

  const secondsLeft = Math.max(0, Math.ceil((session.value.endsAt - Date.now()) / 1000))
  remainingSeconds.value = secondsLeft

  if (secondsLeft === 0) {
    finishRace('timeup')
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

function finishRace(reason: 'timeup' | 'completed') {
  if (raceFinished.value) return

  raceFinished.value = true
  raceFinishedReason.value = reason
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
  const answer = getExpectedSentence()
  const correct = normalizeTypingText(userInput.value) === normalizeTypingText(answer)
  ensureTypingRaceStats()

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
  if (correct) {
    session.value.typingRaceStats!.correctChars += answer.length
    triggerSuccessEffect()
  } else {
    stopSuccessEffect()
  }
  userInput.value = ''

  const nextIndex = currentIndex.value + 1
  session.value.currentIndex = nextIndex
  saveCurrentSession()

  if (nextIndex >= session.value.items.length) {
    finishRace('completed')
    return
  }

  focusInput()
}

function continueRace() {
  if (!session.value) return

  const nextEndsAt = Date.now() + timeLimitSeconds.value * 1000
  session.value = {
    ...session.value,
    endsAt: nextEndsAt,
  }
  userInput.value = ''
  lastOutcome.value = null
  remainingSeconds.value = timeLimitSeconds.value
  raceFinished.value = false
  raceFinishedReason.value = null
  stopSuccessEffect()
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
    typingRaceStats: {
      correctChars: loaded.typingRaceStats?.correctChars ?? 0,
      mistypedChars: loaded.typingRaceStats?.mistypedChars ?? 0,
    },
  }

  session.value = normalizedSession

  if (normalizedSession.currentIndex >= normalizedSession.items.length) {
    remainingSeconds.value = Math.max(
      0,
      Math.ceil(((normalizedSession.endsAt ?? Date.now()) - Date.now()) / 1000),
    )
    raceFinished.value = true
    raceFinishedReason.value = 'completed'
    saveCurrentSession()
    return
  }

  startTimer()
  focusInput()
})

onBeforeUnmount(() => {
  stopTimer()
  stopSuccessEffect()
  void audioContext?.close().catch(() => undefined)
  audioContext = null
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
  position: relative;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  background:
    radial-gradient(circle at top right, rgba(var(--v-theme-primary), 0.12), transparent 30%),
    linear-gradient(180deg, rgba(var(--v-theme-primary), 0.04), transparent 45%),
    rgb(var(--v-theme-surface));
  overflow: hidden;
  transition:
    transform 220ms ease,
    box-shadow 220ms ease,
    border-color 220ms ease;
}

.race-card::after {
  content: '';
  position: absolute;
  inset: -35%;
  background:
    radial-gradient(circle, rgba(var(--v-theme-success), 0.28), transparent 42%);
  opacity: 0;
  transform: scale(0.72);
  pointer-events: none;
}

.race-card--celebrate {
  border-color: rgba(var(--v-theme-success), 0.42);
  box-shadow: 0 22px 38px rgba(var(--v-theme-success), 0.16);
  transform: translateY(-2px) scale(1.01);
}

.race-card--celebrate::after {
  opacity: 1;
  animation: raceSpark 520ms ease-out forwards;
}

.race-score-card {
  border: 1px solid rgba(var(--v-theme-primary), 0.16);
}

.race-sentence {
  font-size: clamp(1.5rem, 3.5vw, 2.3rem);
  line-height: 1.45;
  letter-spacing: 0.01em;
}

.race-translation {
  line-height: 1.7;
}

.race-progress {
  min-height: 1.8em;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.98rem;
  letter-spacing: 0.02em;
  color: rgba(var(--v-theme-on-surface), 0.68);
  word-break: break-word;
}

.race-progress__typed {
  color: rgba(var(--v-theme-success), 0.42);
}

.race-chip--celebrate {
  animation: raceChipBounce 520ms ease-out;
}

.race-actions {
  display: flex;
  justify-content: flex-end;
}

@keyframes raceSpark {
  0% {
    opacity: 0.05;
    transform: scale(0.55);
  }

  35% {
    opacity: 0.95;
    transform: scale(1);
  }

  100% {
    opacity: 0;
    transform: scale(1.28);
  }
}

@keyframes raceChipBounce {
  0% {
    transform: scale(1);
  }

  34% {
    transform: scale(1.14) rotate(-2deg);
  }

  60% {
    transform: scale(0.96) rotate(1deg);
  }

  100% {
    transform: scale(1);
  }
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
