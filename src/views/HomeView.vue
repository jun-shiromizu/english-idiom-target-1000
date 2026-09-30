<template>
  <v-container class="py-8" max-width="600">
    <v-row justify="center">
      <v-col cols="12">
        <div class="header-row mb-6">
          <h1 class="text-h5 font-weight-bold">
            ターゲット暗記アプリ
          </h1>
          <v-btn variant="text" prepend-icon="mdi-palette-outline" @click="openThemeSettings">
            テーマ設定
          </v-btn>
        </div>

        <!-- 中断セッション再開バナー -->
        <v-alert
          v-if="savedSession"
          type="info"
          variant="tonal"
          class="mb-6"
          closable
          @click:close="discardSession"
        >
          <div class="d-flex align-center justify-space-between flex-wrap gap-2">
            <span>
              前回のセッションが保存されています
              （{{ getBookTitle(savedSession.settings.bookId) }} / {{ savedSession.currentIndex }} / {{ savedSession.items.length }}問目）
            </span>
            <v-btn size="small" color="info" variant="elevated" @click="resumeSession">
              再開する
            </v-btn>
          </div>
        </v-alert>

        <v-alert
          v-if="savedBattleSession"
          type="warning"
          variant="tonal"
          class="mb-6"
          closable
          @click:close="discardBattleSession"
        >
          <div class="d-flex align-center justify-space-between flex-wrap gap-2">
            <span>
              バトルの中断データがあります
              （{{ savedBattleSession.status }} / {{ savedBattleSession.dungeonId ?? 'ダンジョン未選択' }}）
            </span>
            <v-btn size="small" color="warning" variant="elevated" @click="resumeBattleSession">
              再開する
            </v-btn>
          </div>
        </v-alert>

        <!-- 出題設定フォーム -->
        <v-card>
          <v-card-title class="pa-4 pb-2 text-subtitle-1">出題設定</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12">
                <v-radio-group
                  v-model="settings.bookId"
                  label="教材"
                  inline
                  aria-label="教材"
                >
                  <v-radio
                    v-for="book in bookItems"
                    :key="book.value"
                    :label="book.label"
                    :value="book.value"
                  />
                </v-radio-group>
              </v-col>
              <v-col cols="12">
                <v-radio-group
                  v-model="selectedAction"
                  label="アクション"
                  inline
                  aria-label="アクション"
                >
                  <v-radio
                    v-for="action in actionItems"
                    :key="action.value"
                    :label="action.label"
                    :value="action.value"
                  />
                </v-radio-group>
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model.number="settings.startNumber"
                  label="開始番号"
                  type="number"
                  :min="1"
                  :max="selectedBook.maxNumber"
                  variant="outlined"
                  density="compact"
                  aria-label="開始番号"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model.number="settings.endNumber"
                  label="終了番号"
                  type="number"
                  :min="1"
                  :max="selectedBook.maxNumber"
                  variant="outlined"
                  density="compact"
                  aria-label="終了番号"
                />
              </v-col>
            </v-row>

            <v-radio-group
              v-model="settings.mode"
              label="出題形式"
              inline
              aria-label="出題形式"
            >
              <v-radio
                v-for="item in modeItems"
                :key="item.value"
                :label="item.label"
                :value="item.value"
                :disabled="isModeDisabled(item.value)"
              />
            </v-radio-group>

            <v-radio-group
              v-model="settings.direction"
              label="出題方向"
              inline
              aria-label="出題方向"
            >
              <v-radio
                v-for="item in directionItems"
                :key="item.value"
                :label="item.label"
                :value="item.value"
                :disabled="isDirectionDisabled(item.value)"
              />
            </v-radio-group>

            <v-radio-group
              v-model="settings.target"
              label="出題対象"
              inline
              aria-label="出題対象"
            >
              <v-radio
                v-for="item in targetItems"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </v-radio-group>

            <v-radio-group
              v-model="settings.order"
              label="出題順序"
              inline
              aria-label="出題順序"
            >
              <v-radio
                v-for="item in orderItems"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </v-radio-group>

            <v-text-field
              v-if="settings.order === 'random'"
              v-model.number="settings.randomQuestionCount"
              label="ランダム出題数"
              type="number"
              :min="1"
              :max="selectedBook.maxNumber"
              variant="outlined"
              density="compact"
              aria-label="ランダム出題数"
            />

            <v-radio-group
              v-model="gameDifficulty"
              label="ゲーム難易度"
              aria-label="ゲーム難易度"
              inline
            >
              <v-radio
                v-for="item in difficultyItems"
                :key="item.value"
                :label="item.label"
                :value="item.value"
                :disabled="selectedAction !== 'game'"
              />
            </v-radio-group>
          </v-card-text>
          <v-card-actions class="pa-4 pt-0 flex-wrap action-buttons">
            <v-spacer />
            <v-btn
              color="primary"
              variant="elevated"
              size="large"
              :loading="startingRoute === selectedAction"
              :disabled="startingRoute !== null || (selectedAction !== 'battle' && !isValid)"
              @click="startSelectedAction"
            >
              開始
            </v-btn>
          </v-card-actions>
        </v-card>

        <!-- エラー表示 -->
        <v-alert v-if="errorMessage" type="error" variant="tonal" class="mt-4">
          {{ errorMessage }}
        </v-alert>

        <!-- 不正解履歴クリア -->
        <v-card class="mt-6" variant="outlined">
          <v-card-title class="pa-4 pb-2 text-subtitle-1 text-medium-emphasis">
            不正解履歴のリセット
          </v-card-title>
          <v-card-text class="pb-2">
            <p class="text-body-2 text-medium-emphasis mb-3">
              記録された不正解履歴をクリアします。「間違えたもの」で絞り込む場合に影響します。
            </p>
            <v-btn
              color="warning"
              variant="outlined"
              size="small"
              @click="showClearDialog = true"
            >
              <v-icon start>mdi-delete-outline</v-icon>
              全履歴をクリア
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>

  <!-- 確認ダイアログ -->
  <v-dialog v-model="showClearDialog" max-width="360">
    <v-card>
      <v-card-title>履歴をクリアしますか？</v-card-title>
      <v-card-text>全ての不正解履歴が削除されます。この操作は元に戻せません。</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="showClearDialog = false">キャンセル</v-btn>
        <v-btn color="warning" variant="elevated" @click="clearAllHistory">クリア</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { GameDifficulty, QuizDirection, QuizSettings } from '@/types'
import {
  BOOK_ORDER,
  DEFAULT_BOOK_ID,
  STORAGE_KEY_GAME_SETTINGS,
  STORAGE_KEY_SETTINGS,
  getBookConfig,
} from '@/config'
import { useGitHubData } from '@/composables/useGitHubData'
import { useQuizSession } from '@/composables/useQuizSession'
import { useHistory } from '@/composables/useHistory'
import { useBattleSession } from '@/composables/useBattleSession'
import type { BattleSession } from '@/types'

const router = useRouter()
const { fetchRangeData } = useGitHubData()
const { buildItems, buildDictationItems, buildClozeItems, saveSession, loadSession, clearSession } = useQuizSession()
const { clearAll } = useHistory()
const {
  loadSession: loadBattleSession,
  clearSession: clearBattleSession,
} = useBattleSession()

const DEFAULT_RANDOM_QUESTION_COUNT = 100

function createDefaultSettings(): QuizSettings {
  return {
    bookId: DEFAULT_BOOK_ID,
    startNumber: 1,
    endNumber: 100,
    mode: 'idiom',
    direction: 'en-to-ja',
    target: 'all',
    order: 'sequential',
    randomQuestionCount: DEFAULT_RANDOM_QUESTION_COUNT,
  }
}

function normalizeSettings(raw: Partial<QuizSettings> | null | undefined): QuizSettings {
  const defaults = createDefaultSettings()
  const bookId = raw?.bookId && BOOK_ORDER.includes(raw.bookId) ? raw.bookId : defaults.bookId
  const maxNumber = getBookConfig(bookId).maxNumber
  const startNumber = Math.min(Math.max(raw?.startNumber ?? defaults.startNumber, 1), maxNumber)
  const endNumber = Math.min(Math.max(raw?.endNumber ?? defaults.endNumber, 1), maxNumber)
  const randomQuestionCount = Math.min(
    Math.max(raw?.randomQuestionCount ?? DEFAULT_RANDOM_QUESTION_COUNT, 1),
    maxNumber,
  )

  return {
    bookId,
    startNumber: Math.min(startNumber, endNumber),
    endNumber: Math.max(startNumber, endNumber),
    mode: raw?.mode ?? defaults.mode,
    direction: raw?.direction === 'ja-to-en' ? 'ja-to-en' : defaults.direction,
    target: raw?.target ?? defaults.target,
    order: raw?.order ?? defaults.order,
    randomQuestionCount,
  }
}

function loadSettings(): QuizSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS)
    return normalizeSettings(raw ? (JSON.parse(raw) as Partial<QuizSettings>) : null)
  } catch {
    return createDefaultSettings()
  }
}

function saveSettings(settings: QuizSettings): void {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings))
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

function saveGameDifficulty(difficulty: GameDifficulty): void {
  localStorage.setItem(STORAGE_KEY_GAME_SETTINGS, JSON.stringify({ difficulty }))
}

const settings = ref<QuizSettings>(createDefaultSettings())
const gameDifficulty = ref<GameDifficulty>(loadGameDifficulty())

const bookItems = BOOK_ORDER.map((bookId) => {
  const book = getBookConfig(bookId)
  return { label: book.title, value: book.id }
})

const modeItems: Array<{ label: string; value: QuizSettings['mode'] }> = [
  { label: '単語／熟語', value: 'idiom' },
  { label: '例文', value: 'sentence' },
]
const directionItems: Array<{ label: string; value: QuizDirection }> = [
  { label: '英語 → 日本語', value: 'en-to-ja' },
  { label: '日本語 → 英語', value: 'ja-to-en' },
]
const targetItems = [
  { label: 'すべて', value: 'all' },
  { label: '間違えたものだけ', value: 'incorrect' },
]
const orderItems = [
  { label: '番号順', value: 'sequential' },
  { label: 'ランダム', value: 'random' },
]
const difficultyItems = [
  { label: 'イージー', value: 'easy' },
  { label: 'ノーマル', value: 'normal' },
  { label: 'ハード', value: 'hard' },
]

type Action = 'quiz' | 'dictation' | 'cloze' | 'typing-race' | 'game' | 'battle'

const actionItems: Array<{ label: string; value: Action }> = [
  { label: '単語帳', value: 'quiz' },
  { label: '書き取り', value: 'dictation' },
  { label: '例文穴埋め', value: 'cloze' },
  { label: 'タイピング', value: 'typing-race' },
  { label: 'ゲーム', value: 'game' },
  { label: 'バトル', value: 'battle' },
]

const selectedAction = ref<Action>('quiz')
const startingRoute = ref<'quiz' | 'dictation' | 'cloze' | 'typing-race' | 'game' | 'battle' | null>(null)

function isModeDisabled(value: QuizSettings['mode']): boolean {
  if (selectedAction.value === 'dictation') return value !== 'idiom'
  if (selectedAction.value === 'cloze' || selectedAction.value === 'typing-race') return value !== 'sentence'
  return false
}

function isDirectionDisabled(value: QuizSettings['direction']): boolean {
  if (selectedAction.value === 'dictation') return value !== 'ja-to-en'
  if (selectedAction.value === 'cloze' || selectedAction.value === 'typing-race') return value !== 'en-to-ja'
  return false
}
const errorMessage = ref('')
const showClearDialog = ref(false)
const savedSession = ref(loadSession())
const savedBattleSession = ref<BattleSession | null>(loadBattleSession())
const selectedBook = computed(() => getBookConfig(settings.value.bookId))

const isValid = computed(
  () =>
    settings.value.startNumber >= 1 &&
    settings.value.endNumber <= selectedBook.value.maxNumber &&
    settings.value.startNumber <= settings.value.endNumber &&
    (settings.value.randomQuestionCount ?? 0) >= 1 &&
    (settings.value.randomQuestionCount ?? 0) <= selectedBook.value.maxNumber,
)

watch(
  selectedAction,
  (action) => {
    if (action === 'dictation') {
      settings.value.bookId = 'word-target-1900'
      settings.value.mode = 'idiom'
      settings.value.direction = 'ja-to-en'
    } else if (action === 'cloze' || action === 'typing-race') {
      settings.value.mode = 'sentence'
      settings.value.direction = 'en-to-ja'
    }
  },
)

watch(
  () => settings.value.bookId,
  () => {
    const maxNumber = selectedBook.value.maxNumber
    if (settings.value.startNumber > maxNumber) settings.value.startNumber = maxNumber
    if (settings.value.endNumber > maxNumber) settings.value.endNumber = maxNumber
  },
)

watch(
  settings,
  (value) => {
    saveSettings(normalizeSettings(value))
  },
  { deep: true },
)

watch(gameDifficulty, (value) => {
  saveGameDifficulty(value)
})

async function startSession(routeName: 'quiz' | 'dictation' | 'cloze' | 'typing-race' | 'game') {
  startingRoute.value = routeName
  errorMessage.value = ''
  try {
    const { dataMap } = await fetchRangeData(
      settings.value.bookId,
      settings.value.startNumber,
      settings.value.endNumber,
    )
    const itemSettings =
      routeName === 'game'
        ? { ...settings.value, randomQuestionCount: undefined }
        : settings.value

    const items =
      routeName === 'dictation'
        ? buildDictationItems(itemSettings, dataMap)
        : routeName === 'cloze'
          ? buildClozeItems(itemSettings, dataMap)
        : buildItems(itemSettings, dataMap)

    if (items.length === 0) {
      errorMessage.value =
        routeName === 'dictation'
          ? '書き取りを出題できる問題がありません。英単語ターゲット1900 / 単語・熟語 / 日本語→英語の設定を確認してください。'
          : routeName === 'cloze'
          ? '例文穴埋めを出題できる問題がありません。例文データと出題設定を確認してください。'
          : '出題できる問題がありません。設定を確認してください。'
      return
    }

    if (routeName === 'game' && items.length < 4) {
      errorMessage.value = '落ち物ゲームは4択を作るため、4問以上の範囲を指定してください。'
      return
    }

    const isTypingRace = routeName === 'typing-race'
    const timeLimitSeconds = 90
    const session = {
      settings: settings.value,
      items,
      currentIndex: 0,
      results: {},
      sessionType:
        routeName === 'dictation'
          ? ('dictation' as const)
          : routeName === 'cloze'
            ? ('cloze' as const)
          : isTypingRace
            ? ('typing-race' as const)
            : ('quiz' as const),
      timeLimitSeconds: isTypingRace ? timeLimitSeconds : undefined,
      endsAt: isTypingRace ? Date.now() + timeLimitSeconds * 1000 : undefined,
    }
    saveSession(session)
    router.push({ name: routeName })
  } catch (e) {
    errorMessage.value = 'データの取得に失敗しました。ネットワーク接続を確認してください。'
    console.error(e)
  } finally {
    startingRoute.value = null
  }
}

function startSelectedAction() {
  if (selectedAction.value === 'battle') {
    openBattleMode()
    return
  }

  void startSession(selectedAction.value)
}

function getBookTitle(bookId: QuizSettings['bookId']) {
  return getBookConfig(bookId).title
}

function resumeSession() {
  const type = savedSession.value?.sessionType
  router.push({
    name:
      type === 'dictation'
        ? 'dictation'
        : type === 'cloze'
          ? 'cloze'
          : type === 'typing-race'
            ? 'typing-race'
            : 'quiz',
  })
}

function resumeBattleSession() {
  const status = savedBattleSession.value?.status
  router.push({
    name:
      status === 'in-battle'
        ? 'battle-play'
        : status === 'cleared' || status === 'defeated'
          ? 'battle-result'
          : status === 'dungeon-select'
            ? 'battle-dungeons'
            : 'battle-deck',
  })
}

function discardSession() {
  clearSession()
  savedSession.value = null
}

function discardBattleSession() {
  clearBattleSession()
  savedBattleSession.value = null
}

function openBattleMode() {
  startingRoute.value = 'battle'
  router.push({ name: 'battle-deck' })
}

function clearAllHistory() {
  clearAll()
  showClearDialog.value = false
}

function openThemeSettings() {
  router.push({ name: 'settings' })
}

onMounted(() => {
  settings.value = loadSettings()
  savedSession.value = loadSession()
  savedBattleSession.value = loadBattleSession()
})
</script>

<style scoped>
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.action-buttons {
  gap: 10px;
}
</style>
