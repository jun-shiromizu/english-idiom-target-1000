<template>
  <v-container class="game-page py-4" max-width="760">
    <div v-if="!session" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <template v-else>
      <div v-if="!gameOver" class="d-flex align-center justify-space-between mb-3">
        <div>
          <div class="text-caption text-medium-emphasis">SCORE</div>
          <div class="text-h6 font-weight-bold">{{ score }}</div>
        </div>
        <ProgressBar :current="currentIndex + 1" :total="session.items.length" class="game-progress" />
        <div class="d-flex align-center ga-1">
          <v-btn variant="text" size="small" @click="togglePause">
            {{ isPaused ? '再開' : '一時停止' }}
          </v-btn>
          <v-btn variant="text" size="small" @click="showQuitDialog = true">終了</v-btn>
        </div>
      </div>

      <section v-if="gameOver" class="game-result">
        <v-icon size="44" color="primary">mdi-trophy-outline</v-icon>
        <h1 class="text-h5 font-weight-bold mt-3 mb-2">{{ completed ? 'ゲームクリア' : 'ゲームオーバー' }}</h1>
        <div class="result-stats">
          <div>
            <span class="text-caption text-medium-emphasis">スコア</span>
            <strong>{{ score }}</strong>
          </div>
          <div>
            <span class="text-caption text-medium-emphasis">正解</span>
            <strong>{{ correctCount }}</strong>
          </div>
          <div>
            <span class="text-caption text-medium-emphasis">ミス</span>
            <strong>{{ missCount }}</strong>
          </div>
        </div>
        <v-card class="result-details mt-4" variant="outlined">
          <v-list density="compact">
            <v-list-item>
              <v-list-item-title>教材</v-list-item-title>
              <template #append>{{ bookTitle }}</template>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>開始番号</v-list-item-title>
              <template #append>{{ startNumberLabel }}</template>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>終了番号</v-list-item-title>
              <template #append>{{ endNumberLabel }}</template>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>出題形式</v-list-item-title>
              <template #append>{{ modeLabel }}</template>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>出題方向</v-list-item-title>
              <template #append>{{ directionLabel }}</template>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>出題対象</v-list-item-title>
              <template #append>{{ targetLabel }}</template>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>出題順序</v-list-item-title>
              <template #append>{{ orderLabel }}</template>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>ゲーム難易度</v-list-item-title>
              <template #append>{{ gameDifficultyLabel }}</template>
            </v-list-item>
          </v-list>
        </v-card>
        <div class="d-flex justify-center flex-wrap game-actions mt-6">
          <v-btn color="primary" variant="elevated" @click="restartGame">
            <v-icon start>mdi-refresh</v-icon>
            もう一度
          </v-btn>
          <v-btn variant="outlined" @click="router.push({ name: 'home' })">
            <v-icon start>mdi-home-outline</v-icon>
            トップへ
          </v-btn>
        </div>

        <template v-if="wrongItems.length > 0">
          <h2 class="text-subtitle-1 font-weight-bold mt-8 mb-2 wrong-answers-heading">
            <v-icon color="error" size="small" class="mr-1">mdi-close-circle</v-icon>
            間違えた問題（{{ wrongItems.length }} 問）
          </h2>
          <v-table density="compact" class="wrong-answers-table">
            <thead>
              <tr>
                <th class="text-left">No.</th>
                <th class="text-left">問題</th>
                <th class="text-left">正解</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in wrongItems" :key="`${item.number}-${item.idiomIndex}-${item.meanIndex}`">
                <td>{{ item.number }}</td>
                <td>{{ item.questionText }}</td>
                <td>{{ getGameAnswerLabel(item) }}</td>
              </tr>
            </tbody>
          </v-table>
        </template>
      </section>

      <template v-else>
        <template v-if="isPaused">
          <section class="play-field paused-field d-flex align-center justify-center">
            <div class="text-center">
              <div class="text-subtitle-1 font-weight-bold mb-2">一時停止中</div>
              <v-btn color="primary" variant="elevated" @click="togglePause">再開する</v-btn>
            </div>
          </section>
        </template>
        <template v-else>
          <section class="play-field" aria-live="polite">
            <div class="danger-line" />
            <div class="falling-word" :style="fallingWordStyle">
              <span class="text-caption text-medium-emphasis">No.{{ currentItem.number }}</span>
              <strong>{{ currentItem.questionText }}</strong>
            </div>
          </section>

          <div class="status-row mt-3 mb-3">
            <v-chip color="secondary" variant="tonal" size="small">{{ difficultyLabel }}</v-chip>
            <v-chip color="primary" variant="tonal" size="small">COMBO {{ combo }}</v-chip>
            <v-chip color="error" variant="tonal" size="small">MISS {{ missCount }}</v-chip>
          </div>

          <div class="choice-grid">
            <v-btn
              v-for="choice in choices"
              :key="choice.label"
              class="choice-button text-none"
              color="primary"
              variant="outlined"
              :disabled="isResolving"
              @click="answer(choice.correct)"
            >
              {{ choice.label }}
            </v-btn>
          </div>
        </template>
      </template>
    </template>
  </v-container>

  <v-dialog v-model="showQuitDialog" max-width="360">
    <v-card>
      <v-card-title>ゲームを終了しますか？</v-card-title>
      <v-card-text>現在のゲーム進行は保存されません。回答履歴は保存済みです。</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="showQuitDialog = false">続ける</v-btn>
        <v-btn color="primary" variant="elevated" @click="router.push({ name: 'home' })">トップへ</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ProgressBar from '@/components/ProgressBar.vue'
import { useGameChoices, getGameAnswerLabel } from '@/composables/useGameChoices'
import { useHistory } from '@/composables/useHistory'
import { useQuizSession } from '@/composables/useQuizSession'
import { STORAGE_KEY_GAME_SETTINGS, getBookConfig } from '@/config'
import type { GameChoice } from '@/composables/useGameChoices'
import type { GameDifficulty, QuizItem, QuizSession } from '@/types'

interface GameDifficultyConfig {
  label: string
  fallSpeed: number
  correctLift: number
  missDrop: number
}

const GAME_DIFFICULTIES: Record<GameDifficulty, GameDifficultyConfig> = {
  easy: {
    label: 'EASY',
    fallSpeed: 20,
    correctLift: 66,
    missDrop: 58,
  },
  normal: {
    label: 'NORMAL',
    fallSpeed: 28,
    correctLift: 59,
    missDrop: 78,
  },
  hard: {
    label: 'HARD',
    fallSpeed: 38,
    correctLift: 52,
    missDrop: 96,
  },
}
const MODE_LABELS = {
  idiom: '単語／熟語',
  sentence: '例文',
} as const
const DIRECTION_LABELS = {
  'en-to-ja': '英語 → 日本語',
  'ja-to-en': '日本語 → 英語',
} as const
const TARGET_LABELS = {
  all: 'すべて',
  incorrect: '間違えたものだけ',
} as const
const ORDER_LABELS = {
  sequential: '番号順',
  random: 'ランダム',
} as const
const GAME_DIFFICULTY_LABELS: Record<GameDifficulty, string> = {
  easy: 'イージー',
  normal: 'ノーマル',
  hard: 'ハード',
}

const router = useRouter()
const { loadSession } = useQuizSession()
const { setResult } = useHistory()
const { buildGameChoices } = useGameChoices()

const session = ref<QuizSession | null>(null)
const currentIndex = ref(0)
const fallY = ref(24)
const score = ref(0)
const combo = ref(0)
const missCount = ref(0)
const correctCount = ref(0)
const choices = ref<GameChoice[]>([])
const difficulty = ref<GameDifficulty>(loadGameDifficulty())
const gameOver = ref(false)
const completed = ref(false)
const isResolving = ref(false)
const isPaused = ref(false)
const showQuitDialog = ref(false)
const wrongItems = ref<QuizItem[]>([])
let animationFrame = 0
let previousFrameTime = 0

const FIELD_HEIGHT = 360
const WORD_HEIGHT = 96
const START_FALL_Y = 24
const NEXT_DELAY_MS = 180

const currentItem = computed(() => session.value!.items[currentIndex.value])
const difficultyConfig = computed(() => GAME_DIFFICULTIES[difficulty.value])
const difficultyLabel = computed(() => difficultyConfig.value.label)
const maxFallY = computed(() => FIELD_HEIGHT - WORD_HEIGHT - 12)
const fallingWordStyle = computed(() => ({
  transform: `translate3d(0, ${fallY.value}px, 0)`,
}))
function getModeLabel(mode: string) {
  return mode === 'sentence' ? MODE_LABELS.sentence : MODE_LABELS.idiom
}

function getDirectionLabel(direction: string) {
  return direction === 'ja-to-en' ? DIRECTION_LABELS['ja-to-en'] : DIRECTION_LABELS['en-to-ja']
}

function getTargetLabel(target: string) {
  return target === 'incorrect' ? TARGET_LABELS.incorrect : TARGET_LABELS.all
}

function getOrderLabel(order: string) {
  return order === 'random' ? ORDER_LABELS.random : ORDER_LABELS.sequential
}

const bookTitle = computed(() => (session.value ? getBookConfig(session.value.settings.bookId).title : ''))
const startNumberLabel = computed(() => (session.value ? `${session.value.settings.startNumber}` : ''))
const endNumberLabel = computed(() => (session.value ? `${session.value.settings.endNumber}` : ''))
const modeLabel = computed(() => (session.value ? getModeLabel(session.value.settings.mode) : ''))
const directionLabel = computed(() =>
  session.value ? getDirectionLabel(session.value.settings.direction) : '',
)
const targetLabel = computed(() => (session.value ? getTargetLabel(session.value.settings.target) : ''))
const orderLabel = computed(() => (session.value ? getOrderLabel(session.value.settings.order) : ''))
const gameDifficultyLabel = computed(() => GAME_DIFFICULTY_LABELS[difficulty.value])

onMounted(() => {
  const loaded = loadSession()
  if (!loaded || loaded.items.length === 0) {
    router.replace({ name: 'home' })
    return
  }

  session.value = loaded
  resetQuestion({ resetPosition: true })
  animationFrame = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
})

function tick(time: number) {
  if (!previousFrameTime) previousFrameTime = time
  const delta = Math.min((time - previousFrameTime) / 1000, 0.05)
  previousFrameTime = time

  if (!gameOver.value && !isResolving.value && !isPaused.value) {
    fallY.value += difficultyConfig.value.fallSpeed * delta
    if (fallY.value >= maxFallY.value) {
      finishGame(false)
      return
    }
  }

  animationFrame = requestAnimationFrame(tick)
}

function loadGameDifficulty(): GameDifficulty {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GAME_SETTINGS)
    const parsed = raw ? (JSON.parse(raw) as { difficulty?: GameDifficulty }) : null
    return parsed?.difficulty === 'easy' || parsed?.difficulty === 'hard'
      ? parsed.difficulty
      : 'normal'
  } catch {
    return 'normal'
  }
}

function resetQuestion(options: { resetPosition?: boolean } = {}) {
  if (!session.value) return
  if (options.resetPosition) {
    fallY.value = START_FALL_Y
  }
  choices.value = buildGameChoices(currentItem.value, session.value.items)
}

function answer(correct: boolean) {
  if (!session.value || isResolving.value || gameOver.value || isPaused.value) return

  recordAnswer(correct)

  if (correct) {
    correctCount.value += 1
    combo.value += 1
    score.value += 100 + combo.value * 10
    fallY.value = Math.max(START_FALL_Y, fallY.value - difficultyConfig.value.correctLift)
    isResolving.value = true
    window.setTimeout(nextQuestion, NEXT_DELAY_MS)
    return
  }

  combo.value = 0
  missCount.value += 1
  if (!wrongItems.value.includes(currentItem.value)) {
    wrongItems.value.push(currentItem.value)
  }
  fallY.value += difficultyConfig.value.missDrop
  if (fallY.value >= maxFallY.value) finishGame(false)
}

function recordAnswer(correct: boolean) {
  if (!session.value) return
  const item = currentItem.value
  const totalItems = item.meanIndex !== undefined ? item.idiomData.means.length : item.idiomData.idioms.length
  const answerIndex = item.meanIndex !== undefined ? item.meanIndex : item.idiomIndex
  setResult(
    session.value.settings.bookId,
    item.number,
    answerIndex,
    totalItems,
    correct,
    session.value.settings.mode,
    session.value.settings.direction,
  )
}

function nextQuestion() {
  if (!session.value) return
  isResolving.value = false

  if (currentIndex.value + 1 >= session.value.items.length) {
    finishGame(true)
    return
  }

  currentIndex.value += 1
  resetQuestion()
}

function finishGame(wasCompleted: boolean) {
  gameOver.value = true
  completed.value = wasCompleted
  isPaused.value = false
  cancelAnimationFrame(animationFrame)
}

function togglePause() {
  if (!session.value) return
  isPaused.value = !isPaused.value
  // 再開直後に pause 中の経過時間が delta に乗らないように現在時刻へ同期する
  if (!isPaused.value) previousFrameTime = performance.now()
}

function restartGame() {
  currentIndex.value = 0
  fallY.value = 24
  score.value = 0
  combo.value = 0
  missCount.value = 0
  correctCount.value = 0
  wrongItems.value = []
  gameOver.value = false
  completed.value = false
  isResolving.value = false
  isPaused.value = false
  previousFrameTime = 0
  difficulty.value = loadGameDifficulty()
  resetQuestion({ resetPosition: true })
  animationFrame = requestAnimationFrame(tick)
}
</script>

<style scoped>
.game-page {
  min-height: 100vh;
}

.game-progress {
  width: min(42vw, 320px);
}

.play-field {
  position: relative;
  height: 360px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  background:
    linear-gradient(rgba(var(--v-theme-primary), 0.05), transparent 42%),
    rgb(var(--v-theme-surface));
}

.paused-field {
  border-style: dashed;
}

.danger-line {
  position: absolute;
  right: 0;
  bottom: 28px;
  left: 0;
  border-top: 2px dashed rgba(var(--v-theme-error), 0.55);
}

.falling-word {
  position: absolute;
  right: 18px;
  left: 18px;
  display: flex;
  min-height: 84px;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 16px 18px;
  border: 2px solid rgba(var(--v-theme-primary), 0.55);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transition: transform 140ms ease-out;
  will-change: transform;
}

.falling-word strong {
  overflow-wrap: anywhere;
  font-size: clamp(1.2rem, 4vw, 2rem);
  line-height: 1.25;
}

.status-row,
.game-actions {
  display: flex;
  gap: 10px;
}

.choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.choice-button {
  min-height: 64px;
  height: auto;
  white-space: normal;
  overflow-wrap: anywhere;
}

.choice-button :deep(.v-btn__content) {
  white-space: normal;
  line-height: 1.25;
}

.game-result {
  display: flex;
  min-height: 520px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.result-stats {
  display: grid;
  width: min(100%, 420px);
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.result-details {
  width: min(100%, 420px);
  text-align: left;
}

.result-stats div {
  display: flex;
  min-height: 72px;
  flex-direction: column;
  justify-content: center;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
}

.result-stats strong {
  font-size: 1.4rem;
}

@media (max-width: 600px) {
  .game-progress {
    width: 38vw;
  }

  .choice-grid {
    grid-template-columns: 1fr;
  }
}

.wrong-answers-heading {
  align-self: flex-start;
}

.wrong-answers-table {
  width: min(100%, 520px);
  text-align: left;
}
</style>
