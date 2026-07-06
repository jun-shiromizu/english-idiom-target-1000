<template>
  <v-container class="dungeon-page py-6" max-width="860">
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
      <div>
        <h1 class="text-h5 font-weight-bold">ダンジョン選択</h1>
        <p class="text-body-2 text-medium-emphasis mt-2">
          挑戦するダンジョンを 1 つ選択してください。
        </p>
      </div>
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="router.push({ name: 'battle-deck' })">
        デッキ作成へ戻る
      </v-btn>
    </div>

    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4">
      {{ errorMessage }}
    </v-alert>

    <div v-if="isLoading" class="dungeon-page__loading text-center">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <template v-else>
      <div class="dungeon-page__body">
        <div class="dungeon-page__list">
          <v-radio-group v-model="selectedDungeonId" aria-label="ダンジョン選択" class="dungeon-list-group">
            <v-card
              v-for="dungeon in dungeons"
              :key="dungeon.id"
              variant="outlined"
              class="mb-4 dungeon-card"
              :class="{ 'dungeon-card--selected': selectedDungeonId === dungeon.id }"
              @click="selectedDungeonId = dungeon.id"
            >
              <v-card-text class="d-flex align-center ga-3 dungeon-card__content">
                <v-radio class="dungeon-card__radio" :value="dungeon.id" :label="undefined" @click.stop />
                <div class="dungeon-card__body">
                  <div class="text-subtitle-1 font-weight-bold">{{ dungeon.name }}</div>
                  <p class="text-body-2 text-medium-emphasis mt-2 mb-2">{{ dungeon.description || '説明未設定' }}</p>
                  <div class="text-caption text-medium-emphasis">Wave 数: {{ dungeon.enemies.length }}</div>
                  <div class="text-caption text-medium-emphasis mt-1">ID: {{ dungeon.id }}</div>
                </div>
              </v-card-text>
            </v-card>
          </v-radio-group>
        </div>

        <div class="dungeon-page__footer d-flex justify-end">
          <v-btn color="primary" variant="elevated" :disabled="!selectedDungeonId" @click="confirmDungeon">
            ダンジョン決定
          </v-btn>
        </div>
      </div>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBattleData } from '@/composables/useBattleData'
import { createInitialBattleSession } from '@/composables/useBattleEngine'
import { useBattleSession } from '@/composables/useBattleSession'
import type { BattleDungeon } from '@/types'

const router = useRouter()
const { fetchCharacters, fetchDungeons } = useBattleData()
const { loadDeck, loadSession, saveSession } = useBattleSession()

const dungeons = ref<BattleDungeon[]>([])
const selectedDungeonId = ref('')
const isLoading = ref(true)
const errorMessage = ref('')

async function confirmDungeon(): Promise<void> {
  const deck = loadSession()?.deck ?? loadDeck()
  if (!deck || !selectedDungeonId.value) {
    router.replace({ name: 'battle-deck' })
    return
  }

  try {
    const dungeon = dungeons.value.find((entry) => entry.id === selectedDungeonId.value)
    if (!dungeon) {
      errorMessage.value = '選択したダンジョンが見つかりません。'
      return
    }

    const characters = await fetchCharacters()
    const session = createInitialBattleSession(deck, dungeon, characters)
    saveSession(session)
    router.push({ name: 'battle-play' })
  } catch (error) {
    errorMessage.value = 'バトル開始データの初期化に失敗しました。'
    console.error(error)
  }
}

onMounted(async () => {
  const savedSession = loadSession()
  const savedDeck = loadDeck()
  if (!savedSession?.deck && !savedDeck) {
    router.replace({ name: 'battle-deck' })
    return
  }

  try {
    dungeons.value = await fetchDungeons()
    selectedDungeonId.value = savedSession?.dungeonId ?? dungeons.value[0]?.id ?? ''
  } catch (error) {
    errorMessage.value = 'バトル用ダンジョンデータの取得に失敗しました。'
    console.error(error)
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.dungeon-page {
  box-sizing: border-box;
  display: flex;
  height: 100dvh;
  max-height: 100dvh;
  flex-direction: column;
  overflow: hidden;
}

.dungeon-page__loading {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
}

.dungeon-page__body {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
}

.dungeon-page__list {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  padding-right: 4px;
}

.dungeon-list-group {
  margin-top: 0;
}

.dungeon-page__footer {
  flex: 0 0 auto;
  padding-top: 12px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgb(var(--v-theme-background));
}

.dungeon-card {
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.dungeon-card--selected {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.05);
}

.dungeon-card__content {
  flex-wrap: nowrap;
}

.dungeon-card__radio {
  flex: 0 0 auto;
}

.dungeon-card__body {
  min-width: 0;
  flex: 1 1 auto;
}

@media (max-width: 600px) {
  .dungeon-card__content {
    align-items: flex-start;
  }
}
</style>
