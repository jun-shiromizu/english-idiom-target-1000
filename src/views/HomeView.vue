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

        <v-alert
          v-if="pageNotice"
          type="warning"
          variant="tonal"
          class="mb-6"
          closable
          @click:close="pageNotice = ''"
        >
          {{ pageNotice }}
        </v-alert>

        <!-- 中断セッション再開バナー -->
        <v-alert
          v-if="resumableSession"
          type="info"
          variant="tonal"
          class="mb-6"
          closable
          @click:close="discardSession"
        >
          <div class="d-flex align-center justify-space-between flex-wrap gap-2">
            <span>
              前回のセッションが保存されています
              （{{ getBookTitle(resumableSession.settings.bookId) }} / {{ resumableSession.currentIndex }} / {{ resumableSession.items.length }}問目）
            </span>
            <v-btn
              size="small"
              color="info"
              variant="elevated"
              :disabled="startingRoute !== null"
              @click="resumeSession"
            >
              再開する
            </v-btn>
          </div>
        </v-alert>

        <v-alert
          v-if="storedSession.kind === 'invalid-classic'"
          type="warning"
          variant="tonal"
          class="mb-6"
        >
          <div class="d-flex align-center justify-space-between flex-wrap gap-2">
            <span>
              保存されている古文単語330の単語帳を再開できません（{{ storedSession.reason }}）。
            </span>
            <v-btn size="small" color="warning" variant="outlined" @click="discardSession">
              破棄する
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
            <v-btn
              size="small"
              color="warning"
              variant="elevated"
              :disabled="startingRoute !== null"
              @click="resumeBattleSession"
            >
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
                    :disabled="selectedAction === 'dictation' && book.value === 'idiom-target-1000'"
                  />
                </v-radio-group>
              </v-col>
              <v-col v-if="isClassicSelected" cols="12" class="pt-0">
                <v-alert type="info" variant="tonal" density="compact">
                  古文単語330は単語帳（古文 → 現代語）のみ対応しています。
                </v-alert>
                <v-alert
                  v-if="switchNotice"
                  type="info"
                  variant="tonal"
                  density="compact"
                  class="mt-2"
                  closable
                  @click:close="switchNotice = ''"
                >
                  {{ switchNotice }}
                </v-alert>
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
                    :disabled="startingRoute !== null || !isActionSupported(settings.bookId, action.value)"
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
import { ref, computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import type {
  BookId,
  ClassicQuizSettings,
  GameDifficulty,
  QuizMode,
  QuizSettings,
  StoredQuizSessionState,
  StudyAction,
  StudyDirection,
  StudySettingsForm,
} from '@/types'
import {
  BOOK_ORDER,
  CLASSIC_BOOK_ID,
  STORAGE_KEY_GAME_SETTINGS,
  getBookConfig,
  isActionSupported,
  isClassicBookId,
  isEnglishBookId,
} from '@/config'
import { useGitHubData } from '@/composables/useGitHubData'
import { useQuizSession } from '@/composables/useQuizSession'
import { useHistory } from '@/composables/useHistory'
import { useBattleSession } from '@/composables/useBattleSession'
import { useAppNotice } from '@/composables/useAppNotice'
import { ClassicDataError } from '@/utils/classicWordData'
import { SessionSaveError } from '@/utils/sessionErrors'
import { createDefaultStudySettings, loadStudySettings, saveStudySettings } from '@/utils/studySettings'
import { trackStudyStarted } from '@/utils/analytics'
import type { BattleSession } from '@/types'

const router = useRouter()
const { fetchRangeData, fetchClassicRangeData } = useGitHubData()
const {
  buildItems,
  buildDictationItems,
  buildClozeItems,
  buildClassicItems,
  createClassicSession,
  saveSession,
  loadStoredSession,
  clearSession,
} = useQuizSession()
const { clearAll } = useHistory()
const {
  loadSession: loadBattleSession,
  clearSession: clearBattleSession,
} = useBattleSession()
const { notice: appNotice, consumeNotice } = useAppNotice()

const CLASSIC_ONLY_QUIZ_MESSAGE = '古文単語330は単語帳（古文 → 現代語）のみ対応しているため'

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

const settings = ref<StudySettingsForm>(createDefaultStudySettings())
const gameDifficulty = ref<GameDifficulty>(loadGameDifficulty())

const bookItems = BOOK_ORDER.map((bookId) => {
  const book = getBookConfig(bookId)
  return { label: book.title, value: book.id }
})

/** UI のみで表示する未対応の古文方向 */
type DirectionOption = StudyDirection | 'modern-to-classic'

const isClassicSelected = computed(() => isClassicBookId(settings.value.bookId))
const modeItems = computed<Array<{ label: string; value: QuizMode }>>(() =>
  isClassicSelected.value
    ? [
        { label: '見出し語', value: 'idiom' },
        { label: '例文', value: 'sentence' },
      ]
    : [
        { label: '単語／熟語', value: 'idiom' },
        { label: '例文', value: 'sentence' },
      ],
)
const directionItems = computed<Array<{ label: string; value: DirectionOption }>>(() =>
  isClassicSelected.value
    ? [
        { label: '古文 → 現代語', value: 'classic-to-modern' },
        { label: '現代語 → 古文', value: 'modern-to-classic' },
      ]
    : [
        { label: '英語 → 日本語', value: 'en-to-ja' },
        { label: '日本語 → 英語', value: 'ja-to-en' },
      ],
)
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

type Action = StudyAction

const actionItems: Array<{ label: string; value: Action }> = [
  { label: '単語帳', value: 'quiz' },
  { label: '書き取り', value: 'dictation' },
  { label: '例文穴埋め', value: 'cloze' },
  { label: 'タイピング', value: 'typing-race' },
  { label: 'ゲーム', value: 'game' },
  { label: 'バトル', value: 'battle' },
]

const selectedAction = ref<Action>('quiz')
const startingRoute = ref<Action | null>(null)
// 取得中に画面を離れた場合、取得完了後に別画面のセッションを上書きしない
let isUnmounted = false

function isModeDisabled(value: QuizMode): boolean {
  if (isClassicSelected.value) return false
  if (selectedAction.value === 'dictation') return value !== 'idiom'
  if (selectedAction.value === 'cloze' || selectedAction.value === 'typing-race') return value !== 'sentence'
  return false
}

function isDirectionDisabled(value: DirectionOption): boolean {
  if (isClassicSelected.value) return value !== 'classic-to-modern'
  if (selectedAction.value === 'dictation') return value !== 'ja-to-en'
  if (selectedAction.value === 'cloze' || selectedAction.value === 'typing-race') return value !== 'en-to-ja'
  return false
}
const errorMessage = ref('')
const pageNotice = ref('')
const switchNotice = ref('')
const showClearDialog = ref(false)
const storedSession = ref<StoredQuizSessionState>(loadStoredSession())
const resumableSession = computed(() =>
  storedSession.value.kind === 'english' || storedSession.value.kind === 'classic'
    ? storedSession.value.session
    : null,
)
const savedBattleSession = ref<BattleSession | null>(loadBattleSession())
const selectedBook = computed(() => getBookConfig(settings.value.bookId))

function isIntegerInRange(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

const isValid = computed(() => {
  const maxNumber = selectedBook.value.maxNumber
  if (isClassicSelected.value) {
    // 古文は1〜330の整数のみ受け付ける
    return (
      isIntegerInRange(settings.value.startNumber, 1, maxNumber) &&
      isIntegerInRange(settings.value.endNumber, 1, maxNumber) &&
      settings.value.startNumber <= settings.value.endNumber &&
      (settings.value.order !== 'random' ||
        settings.value.randomQuestionCount === undefined ||
        isIntegerInRange(settings.value.randomQuestionCount, 1, maxNumber))
    )
  }

  return (
    settings.value.startNumber >= 1 &&
    settings.value.endNumber <= maxNumber &&
    settings.value.startNumber <= settings.value.endNumber &&
    (settings.value.order !== 'random' ||
      settings.value.randomQuestionCount === undefined ||
      (settings.value.randomQuestionCount >= 1 &&
        settings.value.randomQuestionCount <= maxNumber))
  )
})

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
  (bookId) => {
    const maxNumber = selectedBook.value.maxNumber
    if (settings.value.startNumber > maxNumber) settings.value.startNumber = maxNumber
    if (settings.value.endNumber > maxNumber) settings.value.endNumber = maxNumber

    if (!isClassicBookId(bookId)) {
      switchNotice.value = ''
      if (settings.value.direction === 'classic-to-modern') settings.value.direction = 'en-to-ja'
      return
    }

    if (settings.value.randomQuestionCount !== undefined && settings.value.randomQuestionCount > maxNumber) {
      settings.value.randomQuestionCount = maxNumber
    }

    const changes: string[] = []
    if (!isActionSupported(bookId, selectedAction.value)) {
      selectedAction.value = 'quiz'
      changes.push('アクションを単語帳')
    }
    if (settings.value.direction === 'ja-to-en') changes.push('出題方向を古文 → 現代語')
    settings.value.direction = 'classic-to-modern'
    switchNotice.value = changes.length > 0 ? `${CLASSIC_ONLY_QUIZ_MESSAGE}、${changes.join('、')}に変更しました。` : ''
  },
)

watch(
  settings,
  (value) => {
    saveStudySettings(value)
  },
  { deep: true },
)

watch(
  appNotice,
  () => {
    const message = consumeNotice()
    if (message) pageNotice.value = message
  },
  { immediate: true },
)

watch(gameDifficulty, (value) => {
  saveGameDifficulty(value)
})

type SessionRouteName = 'quiz' | 'dictation' | 'cloze' | 'typing-race' | 'game'

function toEnglishQuizSettings(form: StudySettingsForm): QuizSettings | null {
  if (!isEnglishBookId(form.bookId) || form.direction === 'classic-to-modern') return null
  return { ...form, bookId: form.bookId, direction: form.direction }
}

function toClassicQuizSettings(form: StudySettingsForm): ClassicQuizSettings {
  return {
    bookId: CLASSIC_BOOK_ID,
    startNumber: form.startNumber,
    endNumber: form.endNumber,
    mode: form.mode,
    direction: 'classic-to-modern',
    target: form.target,
    order: form.order,
    // 番号順では非表示の入力値を検証しないため、セッションへ持ち込まない
    randomQuestionCount: form.order === 'random' ? form.randomQuestionCount : undefined,
  }
}

function getStartErrorMessage(error: unknown): string {
  if (error instanceof ClassicDataError || error instanceof SessionSaveError) return error.message
  return 'データの取得に失敗しました。ネットワーク接続を確認してください。'
}

async function startClassicSession(form: StudySettingsForm) {
  const classicSettings = toClassicQuizSettings(form)
  const { dataMap } = await fetchClassicRangeData(classicSettings.startNumber, classicSettings.endNumber)
  if (isUnmounted) return
  const items = buildClassicItems(classicSettings, dataMap)

  if (items.length === 0) {
    const allItems = buildClassicItems(
      { ...classicSettings, target: 'all', order: 'sequential', randomQuestionCount: undefined },
      dataMap,
    )
    errorMessage.value =
      allItems.length === 0 && classicSettings.mode === 'sentence'
        ? '指定範囲に出題できる例文がありません。出題形式を「見出し語」にするか、範囲を変更してください。'
        : classicSettings.target === 'incorrect'
          ? '指定範囲に不正解履歴のある問題がありません。出題対象を「すべて」にして開始してください。'
          : '出題できる問題がありません。設定を確認してください。'
    return
  }

  saveSession(createClassicSession(classicSettings, items, dataMap))
  trackStudyStarted({
    bookId: classicSettings.bookId,
    studyMode: 'quiz',
    questionCount: items.length,
    questionMode: classicSettings.mode,
    direction: classicSettings.direction,
    target: classicSettings.target,
    order: classicSettings.order,
  })
  router.push({ name: 'quiz' })
}

async function startSession(routeName: SessionRouteName) {
  startingRoute.value = routeName
  errorMessage.value = ''
  // 取得中に設定が変わっても、開始時点の設定で問題を作る
  const formSettings: StudySettingsForm = { ...settings.value }
  try {
    if (isClassicBookId(formSettings.bookId)) {
      if (routeName !== 'quiz') {
        errorMessage.value = `${CLASSIC_ONLY_QUIZ_MESSAGE}、このアクションは開始できません。`
        return
      }
      await startClassicSession(formSettings)
      return
    }

    const englishSettings = toEnglishQuizSettings(formSettings)
    if (!englishSettings) {
      errorMessage.value = '出題設定が不正です。設定を確認してください。'
      return
    }

    const { dataMap } = await fetchRangeData(
      englishSettings.bookId,
      englishSettings.startNumber,
      englishSettings.endNumber,
    )
    if (isUnmounted) return
    const itemSettings =
      routeName === 'game'
        ? { ...englishSettings, randomQuestionCount: undefined }
        : englishSettings

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
      settings: englishSettings,
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
    trackStudyStarted({
      bookId: englishSettings.bookId,
      studyMode: routeName,
      questionCount: items.length,
      questionMode: englishSettings.mode,
      direction: englishSettings.direction,
      target: englishSettings.target,
      order: englishSettings.order,
    })
    router.push({ name: routeName })
  } catch (e) {
    errorMessage.value = getStartErrorMessage(e)
    console.error(e)
  } finally {
    startingRoute.value = null
  }
}

function startSelectedAction() {
  if (!isActionSupported(settings.value.bookId, selectedAction.value)) {
    errorMessage.value = `${CLASSIC_ONLY_QUIZ_MESSAGE}、このアクションは開始できません。`
    return
  }

  if (selectedAction.value === 'battle') {
    openBattleMode()
    return
  }

  void startSession(selectedAction.value)
}

function getBookTitle(bookId: BookId) {
  return getBookConfig(bookId).title
}

function resumeSession() {
  if (startingRoute.value !== null) return
  const stored = storedSession.value
  if (stored.kind === 'classic') {
    router.push({ name: 'quiz' })
    return
  }
  const type = stored.kind === 'english' ? stored.session.sessionType : undefined
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
  if (startingRoute.value !== null) return
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
  storedSession.value = { kind: 'none' }
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
  settings.value = loadStudySettings()
  storedSession.value = loadStoredSession()
  savedBattleSession.value = loadBattleSession()
})

onBeforeUnmount(() => {
  isUnmounted = true
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
