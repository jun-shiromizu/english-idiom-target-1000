<template>
  <v-container class="py-8" max-width="720">
    <div v-if="!session" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-card v-else>
      <v-card-title class="text-h6">{{ session.status === 'cleared' ? 'ダンジョンクリア' : 'バトル敗北' }}</v-card-title>
      <v-card-text>
        <v-list density="compact">
          <v-list-item title="状態">
            <template #append>{{ session.status }}</template>
          </v-list-item>
          <v-list-item title="ダンジョンID">
            <template #append>{{ session.dungeonId ?? '未設定' }}</template>
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
            <template #append>{{ session.deck.leaderId }}</template>
          </v-list-item>
          <v-list-item title="メンバー数">
            <template #append>{{ session.deck.memberIds.length }}</template>
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
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBattleSession } from '@/composables/useBattleSession'
import type { BattleSession } from '@/types'

const router = useRouter()
const { loadSession } = useBattleSession()
const session = ref<BattleSession | null>(null)

onMounted(() => {
  const loaded = loadSession()
  if (!loaded?.deck || !loaded.dungeonId) {
    router.replace({ name: 'battle-deck' })
    return
  }

  session.value = loaded
})
</script>