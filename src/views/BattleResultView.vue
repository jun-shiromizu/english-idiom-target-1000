<template>
  <v-container class="py-8" max-width="840">
    <div v-if="isLoading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-card v-else-if="session">
      <v-card-title class="text-h6">{{ session.status === 'cleared' ? 'ダンジョンクリア' : 'バトル敗北' }}</v-card-title>
      <v-card-text>
        <section v-if="defeatedEnemies.length > 0" class="mb-6">
          <div class="text-subtitle-2 font-weight-bold mb-3">倒した敵</div>
          <div class="result-icon-row">
            <div v-for="enemy in defeatedEnemies" :key="enemy.id" class="result-icon-item">
              <v-avatar size="64" rounded="lg" class="result-avatar">
                <img v-if="enemy.iconUrl" :src="enemy.iconUrl" :alt="`${enemy.name} icon`" class="result-avatar-image" />
                <v-icon v-else icon="mdi-emoticon-devil-outline" size="36" />
              </v-avatar>
              <div class="text-caption text-center mt-2">{{ enemy.name }}</div>
            </div>
          </div>
        </section>

        <section v-if="partyCharacters.length > 0" class="mb-6">
          <div class="text-subtitle-2 font-weight-bold mb-3">パーティ</div>
          <div class="result-icon-row result-icon-row--party">
            <div v-for="character in partyCharacters" :key="character.id" class="result-icon-item">
              <v-badge :model-value="character.id === session.deck.leaderId" content="L" color="primary" offset-x="6" offset-y="6">
                <v-avatar rounded="lg" class="result-avatar result-avatar--party">
                  <img :src="character.iconUrl" :alt="`${character.name} icon`" class="result-avatar-image" />
                </v-avatar>
              </v-badge>
              <div class="text-caption text-center mt-2">{{ character.name }}</div>
            </div>
          </div>
        </section>

        <v-list density="compact">
          <v-list-item title="状態">
            <template #append>{{ session.status }}</template>
          </v-list-item>
          <v-list-item title="ダンジョン名">
            <template #append>{{ dungeonName }}</template>
          </v-list-item>
          <v-list-item title="到達 Wave">
            <template #append>{{ session.currentWaveIndex + 1 }}</template>
          </v-list-item>
          <v-list-item title="ターン数">
            <template #append>{{ session.turn }}</template>
          </v-list-item>
          <v-list-item title="スコア">
            <template #append>{{ session.score }}</template>
          </v-list-item>
          <v-list-item title="直前の与ダメージ">
            <template #append>{{ session.lastAttackDamage ?? 0 }}</template>
          </v-list-item>
          <v-list-item title="リーダー">
            <template #append>{{ leaderName }}</template>
          </v-list-item>
          <v-list-item title="教材">
            <template #append>{{ settingsSummary.bookTitle }}</template>
          </v-list-item>
          <v-list-item title="開始番号">
            <template #append>{{ settingsSummary.startNumber }}</template>
          </v-list-item>
          <v-list-item title="終了番号">
            <template #append>{{ settingsSummary.endNumber }}</template>
          </v-list-item>
          <v-list-item title="出題形式">
            <template #append>{{ settingsSummary.modeLabel }}</template>
          </v-list-item>
          <v-list-item title="出題方向">
            <template #append>{{ settingsSummary.directionLabel }}</template>
          </v-list-item>
          <v-list-item title="出題対象">
            <template #append>{{ settingsSummary.targetLabel }}</template>
          </v-list-item>
          <v-list-item title="出題順序">
            <template #append>{{ settingsSummary.orderLabel }}</template>
          </v-list-item>
        </v-list>

        <v-alert
          v-if="session.status === 'defeated' && session.lastIncorrectReview"
          type="warning"
          variant="tonal"
          class="mt-4"
        >
          <div class="font-weight-bold mb-1">直前に間違えた問題</div>
          <div class="text-body-2 mb-1">問題: {{ session.lastIncorrectReview.question }}</div>
          <div class="text-body-2">正しい答え: {{ session.lastIncorrectReview.answer }}</div>
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="router.push({ name: 'battle-dungeons' })">ダンジョン選択へ戻る</v-btn>
        <v-btn color="primary" variant="elevated" @click="router.push({ name: 'home' })">トップへ</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { BOOK_ORDER, DEFAULT_BOOK_ID, STORAGE_KEY_SETTINGS, buildBattleGitHubRawBase, getBookConfig } from '@/config'
import { useBattleData } from '@/composables/useBattleData'
import { useBattleSession } from '@/composables/useBattleSession'
import type { BattleCharacter, BattleDungeon, BattleEnemy, BattleSession, QuizSettings } from '@/types'

interface DisplaySettingsSummary {
  bookTitle: string
  startNumber: number
  endNumber: number
  modeLabel: string
  directionLabel: string
  targetLabel: string
  orderLabel: string
}

const router = useRouter()
const { loadSession } = useBattleSession()
const { fetchCharacters, fetchDungeons } = useBattleData()
const session = ref<BattleSession | null>(null)
const characters = ref<BattleCharacter[]>([])
const dungeons = ref<BattleDungeon[]>([])
const isLoading = ref(true)
const battleRawBase = buildBattleGitHubRawBase()

function createDefaultSettings(): QuizSettings {
  return {
    bookId: DEFAULT_BOOK_ID,
    startNumber: 1,
    endNumber: 100,
    mode: 'idiom',
    direction: 'en-to-ja',
    target: 'all',
    order: 'random',
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
    mode: raw?.mode === 'sentence' ? 'sentence' : defaults.mode,
    direction: raw?.direction === 'ja-to-en' ? 'ja-to-en' : defaults.direction,
    target: raw?.target === 'incorrect' ? 'incorrect' : defaults.target,
    order: raw?.order === 'sequential' ? 'sequential' : defaults.order,
  }
}

function loadAttackSettings(): QuizSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS)
    return normalizeSettings(raw ? (JSON.parse(raw) as Partial<QuizSettings>) : null)
  } catch {
    return createDefaultSettings()
  }
}

function resolveBattleAsset(iconPath: string): string {
  if (/^https?:\/\//.test(iconPath)) {
    return iconPath
  }

  const normalizedPath = iconPath
    .replace(/^\/+/, '')
    .replace(/^\.\//, '')

  if (normalizedPath.startsWith('battle/')) {
    return `${battleRawBase}/${normalizedPath}`
  }

  if (normalizedPath.startsWith('icons/')) {
    return `${battleRawBase}/battle/${normalizedPath}`
  }

  if (normalizedPath.startsWith('characters/') || normalizedPath.startsWith('enemies/')) {
    return `${battleRawBase}/battle/icons/${normalizedPath}`
  }

  return `${battleRawBase}/${normalizedPath}`
}

const dungeon = computed(() => dungeons.value.find((entry) => entry.id === session.value?.dungeonId) ?? null)
const dungeonName = computed(() => dungeon.value?.name ?? session.value?.dungeonId ?? '未設定')
const leaderName = computed(() => {
  const leaderId = session.value?.deck.leaderId
  return characters.value.find((entry) => entry.id === leaderId)?.name ?? leaderId ?? '未設定'
})
const partyCharacters = computed(() => {
  if (!session.value) return []
  const ids = [session.value.deck.leaderId, ...session.value.deck.memberIds]

  return ids
    .map((id) => characters.value.find((entry) => entry.id === id) ?? null)
    .filter((character): character is BattleCharacter => character !== null)
    .map((character) => ({
      id: character.id,
      name: character.name,
      iconUrl: resolveBattleAsset(character.icon),
    }))
})
const defeatedEnemies = computed(() => {
  if (!session.value || !dungeon.value) return []

  const defeatedCount = session.value.status === 'cleared'
    ? session.value.currentWaveIndex + 1
    : session.value.currentWaveIndex

  return dungeon.value.enemies
    .slice(0, defeatedCount)
    .map((enemy: BattleEnemy) => ({
      id: enemy.id,
      name: enemy.name,
      iconUrl: enemy.icon ? resolveBattleAsset(enemy.icon) : '',
    }))
})
const settingsSummary = computed<DisplaySettingsSummary>(() => {
  const settings = loadAttackSettings()
  return {
    bookTitle: getBookConfig(settings.bookId).title,
    startNumber: settings.startNumber,
    endNumber: settings.endNumber,
    modeLabel: settings.mode === 'sentence' ? '例文' : '単語/熟語',
    directionLabel: settings.direction === 'ja-to-en' ? '日本語→英語' : '英語→日本語',
    targetLabel: settings.target === 'incorrect' ? '間違えたものだけ' : 'すべて',
    orderLabel: settings.order === 'random' ? 'ランダム' : '番号順',
  }
})

onMounted(() => {
  void (async () => {
    const loaded = loadSession()
    if (!loaded?.deck || !loaded.dungeonId) {
      router.replace({ name: 'battle-deck' })
      return
    }

    session.value = loaded

    try {
      const [loadedCharacters, loadedDungeons] = await Promise.all([
        fetchCharacters(),
        fetchDungeons(),
      ])
      characters.value = loadedCharacters
      dungeons.value = loadedDungeons
    } finally {
      isLoading.value = false
    }
  })()
})
</script>

<style scoped>
.result-icon-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.result-icon-row--party {
  flex-wrap: nowrap;
  gap: 8px;
}

.result-icon-item {
  width: 72px;
}

.result-icon-row--party .result-icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  flex: 1 1 0;
  width: auto;
}

.result-avatar {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.16);
}

.result-avatar--party {
  width: min(100%, 60px);
  height: auto;
  aspect-ratio: 1;
  margin: 0 auto;
}

.result-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

@media (max-width: 600px) {
  .result-icon-row {
    gap: 10px;
  }

  .result-icon-item {
    width: 64px;
  }

  .result-icon-row--party {
    gap: 4px;
  }

  .result-avatar--party {
    width: min(100%, 52px);
  }
}
</style>
