<template>
  <v-container class="py-8" max-width="600">
    <div v-if="!session" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <template v-else>
      <h2 class="text-h5 font-weight-bold text-center mb-6">結果</h2>

      <!-- スコアカード -->
      <v-card class="mb-6 text-center" color="primary" variant="tonal">
        <v-card-text class="py-8">
          <p class="text-h2 font-weight-bold">{{ correctCount }}</p>
          <p class="text-h6">/ {{ session.items.length }} 問</p>
          <p class="text-body-1 mt-2">正解率: {{ Math.round((correctCount / session.items.length) * 100) }}%</p>
        </v-card-text>
      </v-card>

      <!-- 内訳 -->
      <v-card class="mb-6" variant="outlined">
        <v-list>
          <v-list-item>
            <template #prepend>
              <v-icon color="success">mdi-check-circle</v-icon>
            </template>
            <v-list-item-title>正解</v-list-item-title>
            <template #append>
              <span class="font-weight-bold text-success">{{ correctCount }} 問</span>
            </template>
          </v-list-item>
          <v-divider />
          <v-list-item>
            <template #prepend>
              <v-icon color="error">mdi-close-circle</v-icon>
            </template>
            <v-list-item-title>不正解</v-list-item-title>
            <template #append>
              <span class="font-weight-bold text-error">{{ incorrectCount }} 問</span>
            </template>
          </v-list-item>
        </v-list>
      </v-card>

      <!-- アクションボタン -->
      <v-row>
        <v-col cols="12">
          <v-btn block variant="outlined" size="large" @click="goHome">
            <v-icon start>mdi-home</v-icon>
            トップページへ
          </v-btn>
        </v-col>
        <v-col cols="12">
          <v-btn
            block
            color="primary"
            variant="elevated"
            size="large"
            :disabled="incorrectCount === 0"
            @click="retryIncorrect"
          >
            <v-icon start>mdi-refresh</v-icon>
            間違えたところをやり直す
          </v-btn>
        </v-col>
        <v-col cols="12">
          <v-btn
            block
            color="warning"
            variant="outlined"
            size="large"
            @click="showClearAndRetryDialog = true"
          >
            <v-icon start>mdi-delete-restore</v-icon>
            間違いデータをクリアしてもう一度
          </v-btn>
        </v-col>
      </v-row>
    </template>
  </v-container>

  <v-dialog v-model="showClearAndRetryDialog" max-width="360">
    <v-card>
      <v-card-title>履歴をクリアしますか？</v-card-title>
      <v-card-text>
        この範囲（{{ session?.settings.startNumber }}〜{{ session?.settings.endNumber }}番）の
        不正解履歴をクリアして最初からやり直します。
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="showClearAndRetryDialog = false">キャンセル</v-btn>
        <v-btn color="warning" variant="elevated" @click="clearAndRetry">クリアして再挑戦</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuizSession } from '@/composables/useQuizSession'
import { useHistory } from '@/composables/useHistory'
import type { QuizSession } from '@/types'

const router = useRouter()
const { loadSession, saveSession, clearSession } = useQuizSession()
const { clearRange } = useHistory()

const session = ref<QuizSession | null>(null)
const showClearAndRetryDialog = ref(false)

const correctCount = computed(() => {
  if (!session.value) return 0
  return Object.values(session.value.results).filter(Boolean).length
})
const incorrectCount = computed(() => {
  if (!session.value) return 0
  return Object.values(session.value.results).filter((v) => !v).length
})

onMounted(() => {
  const loaded = loadSession()
  if (!loaded) {
    router.replace({ name: 'home' })
    return
  }
  session.value = loaded
})

function goHome() {
  clearSession()
  router.push({ name: 'home' })
}

function retryIncorrect() {
  if (!session.value) return
  const incorrectItems = session.value.items.filter((_, i) => session.value!.results[i] === false)
  const retrySession = {
    ...session.value,
    settings: { ...session.value.settings, target: 'incorrect' as const },
    items: incorrectItems,
    currentIndex: 0,
    results: {},
  }
  saveSession(retrySession)
  router.push({ name: 'quiz' })
}

function clearAndRetry() {
  if (!session.value) return
  const { startNumber, endNumber } = session.value.settings
  clearRange(startNumber, endNumber)
  const retrySession = {
    ...session.value,
    currentIndex: 0,
    results: {},
  }
  saveSession(retrySession)
  showClearAndRetryDialog.value = false
  router.push({ name: 'quiz' })
}
</script>
