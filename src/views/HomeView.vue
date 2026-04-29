<template>
  <v-container class="py-8" max-width="600">
    <v-row justify="center">
      <v-col cols="12">
        <h1 class="text-h5 font-weight-bold text-center mb-6">
          英熟語ターゲット1000
        </h1>

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
              （{{ savedSession.currentIndex }} / {{ savedSession.items.length }}問目）
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
              <v-col cols="6">
                <v-text-field
                  v-model.number="settings.startNumber"
                  label="開始番号"
                  type="number"
                  :min="1"
                  :max="1000"
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
                  :max="1000"
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
          </v-card-text>
          <v-card-actions class="pa-4 pt-0">
            <v-spacer />
            <v-btn
              color="primary"
              variant="elevated"
              size="large"
              :loading="loading"
              :disabled="!isValid"
              @click="startQuiz"
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { QuizSettings } from '@/types'
import { useGitHubData } from '@/composables/useGitHubData'
import { useQuizSession } from '@/composables/useQuizSession'
import { useHistory } from '@/composables/useHistory'

const router = useRouter()
const { fetchRangeData, fetchSupplements } = useGitHubData()
const { buildItems, saveSession, loadSession, clearSession } = useQuizSession()
const { clearAll } = useHistory()

const settings = ref<QuizSettings>({
  startNumber: 1,
  endNumber: 100,
  mode: 'idiom',
  target: 'all',
  order: 'sequential',
})

const modeItems = [
  { label: '熟語（英語 → 日本語）', value: 'idiom' },
  { label: '例文（英語 → 日本語）', value: 'sentence' },
]
const targetItems = [
  { label: 'すべて', value: 'all' },
  { label: '間違えたものだけ', value: 'incorrect' },
]
const orderItems = [
  { label: '番号順', value: 'sequential' },
  { label: 'ランダム', value: 'random' },
]

const loading = ref(false)
const errorMessage = ref('')
const showClearDialog = ref(false)
const savedSession = ref(loadSession())

const isValid = computed(
  () =>
    settings.value.startNumber >= 1 &&
    settings.value.endNumber <= 1000 &&
    settings.value.startNumber <= settings.value.endNumber,
)

async function startQuiz() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { dataMap, supplementFiles } = await fetchRangeData(
      settings.value.startNumber,
      settings.value.endNumber,
    )

    // 補足HTMLマップ構築
    const supplementHtmlMap = new Map<string, string[]>()
    for (const [number] of dataMap) {
      const htmlList = await fetchSupplements(number, supplementFiles)
      if (htmlList.length) supplementHtmlMap.set(number, htmlList)
    }

    const items = buildItems(settings.value, dataMap, supplementHtmlMap)

    if (items.length === 0) {
      errorMessage.value = '出題できる問題がありません。設定を確認してください。'
      return
    }

    const session = {
      settings: settings.value,
      items,
      currentIndex: 0,
      results: {},
    }
    saveSession(session)
    router.push({ name: 'quiz' })
  } catch (e) {
    errorMessage.value = 'データの取得に失敗しました。ネットワーク接続を確認してください。'
    console.error(e)
  } finally {
    loading.value = false
  }
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

onMounted(() => {
  savedSession.value = loadSession()
})
</script>
