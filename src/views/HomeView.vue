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

            <v-select
              v-model="settings.mode"
              label="出題形式"
              :items="modeItems"
              item-title="label"
              item-value="value"
              variant="outlined"
              density="compact"
              class="mb-2"
              aria-label="出題形式"
            />

            <v-select
              v-model="settings.direction"
              label="出題方向"
              :items="directionItems"
              item-title="label"
              item-value="value"
              variant="outlined"
              density="compact"
              class="mb-2"
              aria-label="出題方向"
            />

            <v-select
              v-model="settings.target"
              label="出題対象"
              :items="targetItems"
              item-title="label"
              item-value="value"
              variant="outlined"
              density="compact"
              class="mb-2"
              aria-label="出題対象"
            />

            <v-select
              v-model="settings.order"
              label="出題順序"
              :items="orderItems"
              item-title="label"
              item-value="value"
              variant="outlined"
              density="compact"
              aria-label="出題順序"
            />

            <v-select
              v-model="gameDifficulty"
              label="ゲーム難易度"
              :items="difficultyItems"
              item-title="label"
              item-value="value"
              variant="outlined"
              density="compact"
              aria-label="ゲーム難易度"
            />
          </v-card-text>
          <v-card-actions class="pa-4 pt-0 flex-wrap action-buttons">
            <v-spacer />
            <v-btn
              color="primary"
              variant="elevated"
              size="large"
              :loading="startingRoute === 'quiz'"
              :disabled="!isValid || startingRoute !== null"
              @click="startSession('quiz')"
            >
              <v-icon start>mdi-card-text-outline</v-icon>
              単語帳
            </v-btn>
            <v-btn
              color="primary"
              variant="outlined"
              size="large"
              :loading="startingRoute === 'game'"
              :disabled="!isValid || startingRoute !== null"
              @click="startSession('game')"
            >
              <v-icon start>mdi-gamepad-variant-outline</v-icon>
              落ち物ゲーム
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

const router = useRouter()
const { fetchRangeData } = useGitHubData()
const { buildItems, saveSession, loadSession, clearSession } = useQuizSession()
const { clearAll } = useHistory()

function createDefaultSettings(): QuizSettings {
  return {
    bookId: DEFAULT_BOOK_ID,
    startNumber: 1,
    endNumber: 100,
    mode: 'idiom',
    direction: 'en-to-ja',
    target: 'all',
    order: 'sequential',
  }
}

function normalizeSettings(raw: Partial<QuizSettings> | null | undefined): QuizSettings {
  const defaults = createDefaultSettings()
  const bookId = raw?.bookId && BOOK_ORDER.includes(raw.bookId) ? raw.bookId : defaults.bookId
  const maxNumber = getBookConfig(bookId).maxNumber
  const startNumber = Math.min(Math.max(raw?.startNumber ?? defaults.startNumber, 1), maxNumber)
  const endNumber = Math.min(Math.max(raw?.endNumber ?? defaults.endNumber, 1), maxNumber)

  return {
    bookId,
    startNumber: Math.min(startNumber, endNumber),
    endNumber: Math.max(startNumber, endNumber),
    mode: raw?.mode ?? defaults.mode,
    direction: raw?.direction === 'ja-to-en' ? 'ja-to-en' : defaults.direction,
    target: raw?.target ?? defaults.target,
    order: raw?.order ?? defaults.order,
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

const modeItems = [
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

const startingRoute = ref<'quiz' | 'game' | null>(null)
const errorMessage = ref('')
const showClearDialog = ref(false)
const savedSession = ref(loadSession())
const selectedBook = computed(() => getBookConfig(settings.value.bookId))

const isValid = computed(
  () =>
    settings.value.startNumber >= 1 &&
    settings.value.endNumber <= selectedBook.value.maxNumber &&
    settings.value.startNumber <= settings.value.endNumber,
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

async function startSession(routeName: 'quiz' | 'game') {
  startingRoute.value = routeName
  errorMessage.value = ''
  try {
    const { dataMap } = await fetchRangeData(
      settings.value.bookId,
      settings.value.startNumber,
      settings.value.endNumber,
    )

    const items = buildItems(settings.value, dataMap)

    if (items.length === 0) {
      errorMessage.value = '出題できる問題がありません。設定を確認してください。'
      return
    }

    if (routeName === 'game' && items.length < 4) {
      errorMessage.value = '落ち物ゲームは4択を作るため、4問以上の範囲を指定してください。'
      return
    }

    const session = {
      settings: settings.value,
      items,
      currentIndex: 0,
      results: {},
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

function getBookTitle(bookId: QuizSettings['bookId']) {
  return getBookConfig(bookId).title
}

function resumeSession() {
  router.push({ name: 'quiz' })
}

function discardSession() {
  clearSession()
  savedSession.value = null
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
