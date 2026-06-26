<template>
  <v-container class="py-8" max-width="960">
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">デッキ作成</h1>
        <p class="text-body-2 text-medium-emphasis mt-2">
          リーダー 1 人とメンバー 4 人を選んでバトル用デッキを作成します。
        </p>
      </div>
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="router.push({ name: 'home' })">
        トップへ戻る
      </v-btn>
    </div>

    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-6">
      {{ errorMessage }}
    </v-alert>

    <div v-if="isLoading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <template v-else>
      <v-row class="mb-4">
        <v-col cols="12" md="4">
          <v-card variant="outlined" class="fill-height">
            <v-card-title class="text-subtitle-1">現在のデッキ</v-card-title>
            <v-card-text>
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title>リーダー</v-list-item-title>
                  <template #append>{{ selectedLeader?.name ?? '未選択' }}</template>
                </v-list-item>
                <v-list-item v-for="(member, index) in selectedMembers" :key="member.id">
                  <v-list-item-title>メンバー {{ index + 1 }}</v-list-item-title>
                  <template #append>{{ member.name }}</template>
                </v-list-item>
                <v-list-item v-for="index in emptyMemberCount" :key="`empty-${index}`">
                  <v-list-item-title>メンバー {{ selectedMembers.length + index }}</v-list-item-title>
                  <template #append>未選択</template>
                </v-list-item>
              </v-list>
            </v-card-text>
            <v-card-actions>
              <v-btn block color="primary" variant="elevated" :disabled="!isDeckComplete" @click="confirmDeck">
                デッキ決定
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>

        <v-col cols="12" md="8">
          <v-row>
            <v-col v-for="character in characters" :key="character.id" cols="12" sm="6">
              <v-card variant="outlined" class="character-card fill-height">
                <v-card-title class="d-flex align-center justify-space-between ga-2">
                  <div class="d-flex align-center ga-3 min-w-0">
                    <v-avatar size="104" rounded="lg" class="character-avatar">
                      <img :src="resolveCharacterIcon(character.icon)" :alt="`${character.name} icon`" class="character-avatar-image" />
                    </v-avatar>
                    <span class="text-truncate">{{ character.name }}</span>
                  </div>
                  <v-chip v-if="selectedLeaderId === character.id" color="primary" size="small">Leader</v-chip>
                </v-card-title>
                <v-card-text>
                  <div class="text-body-2 text-medium-emphasis mb-2">ATK {{ character.atk }} / HP {{ character.hp }}</div>
                  <div class="text-body-2 mb-2">LS: {{ character.leaderSkill.name }}</div>
                  <div class="text-body-2 text-medium-emphasis">Skill: {{ character.activeSkill.name }}</div>
                </v-card-text>
                <v-card-actions class="flex-wrap ga-2">
                  <v-btn variant="text" color="secondary" @click="openCharacterDetail(character)">
                    詳細
                  </v-btn>
                  <v-btn
                    color="primary"
                    variant="elevated"
                    :disabled="selectedLeaderId === character.id"
                    @click="selectLeader(character.id)"
                  >
                    リーダーにする
                  </v-btn>
                  <v-btn
                    variant="outlined"
                    :disabled="selectedLeaderId === character.id || (!isMember(character.id) && selectedMemberIds.length >= 4)"
                    @click="toggleMember(character.id)"
                  >
                    {{ isMember(character.id) ? 'メンバー解除' : 'メンバー追加' }}
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </template>
  </v-container>

  <v-dialog v-model="isDetailDialogOpen" max-width="520">
    <v-card v-if="detailCharacter">
      <v-card-title class="d-flex align-center ga-3">
        <v-avatar size="72" rounded="lg" class="character-avatar">
          <img :src="resolveCharacterIcon(detailCharacter.icon)" :alt="`${detailCharacter.name} icon`" class="character-avatar-image" />
        </v-avatar>
        <div>
          <div class="text-h6">{{ detailCharacter.name }}</div>
          <div class="text-body-2 text-medium-emphasis">ATK {{ detailCharacter.atk }} / HP {{ detailCharacter.hp }}</div>
        </div>
      </v-card-title>
      <v-card-text>
        <v-card variant="tonal" color="primary" class="mb-4">
          <v-card-text>
            <div class="text-subtitle-2 font-weight-bold mb-2">リーダースキル: {{ detailCharacter.leaderSkill.name }}</div>
            <div class="text-body-2">{{ detailCharacter.leaderSkill.description }}</div>
          </v-card-text>
        </v-card>

        <v-card variant="tonal" color="secondary">
          <v-card-text>
            <div class="text-subtitle-2 font-weight-bold mb-2">スキル: {{ detailCharacter.activeSkill.name }}</div>
            <div class="text-body-2 mb-2">{{ detailCharacter.activeSkill.description }}</div>
            <div class="text-caption text-medium-emphasis">クールダウン {{ detailCharacter.activeSkill.cooldownTurns }} ターン</div>
          </v-card-text>
        </v-card>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="isDetailDialogOpen = false">閉じる</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { buildBattleGitHubRawBase } from '@/config'
import { useBattleData } from '@/composables/useBattleData'
import { useBattleSession } from '@/composables/useBattleSession'
import type { BattleCharacter } from '@/types'

const router = useRouter()
const { fetchCharacters } = useBattleData()
const { loadDeck, loadSession, saveDeck, saveSession, createSession } = useBattleSession()

const characters = ref<BattleCharacter[]>([])
const isLoading = ref(true)
const errorMessage = ref('')
const selectedLeaderId = ref('')
const selectedMemberIds = ref<string[]>([])
const detailCharacter = ref<BattleCharacter | null>(null)
const isDetailDialogOpen = ref(false)
const battleRawBase = buildBattleGitHubRawBase()

const selectedLeader = computed(
  () => characters.value.find((character) => character.id === selectedLeaderId.value) ?? null,
)
const selectedMembers = computed(() =>
  selectedMemberIds.value
    .map((memberId) => characters.value.find((character) => character.id === memberId) ?? null)
    .filter((character): character is BattleCharacter => character !== null),
)
const emptyMemberCount = computed(() => Math.max(0, 4 - selectedMembers.value.length))
const isDeckComplete = computed(() => Boolean(selectedLeaderId.value) && selectedMemberIds.value.length === 4)

function resolveCharacterIcon(iconPath: string): string {
  if (/^https?:\/\//.test(iconPath)) {
    return iconPath
  }

  return `${battleRawBase}/${iconPath.replace(/^\/+/, '')}`
}

function applyDeck(characterIds: string[]) {
  const availableIds = new Set(characters.value.map((character) => character.id))
  const [leaderId, ...memberIds] = characterIds.filter((characterId) => availableIds.has(characterId))
  if (!leaderId || memberIds.length !== 4) return

  selectedLeaderId.value = leaderId
  selectedMemberIds.value = memberIds.slice(0, 4)
}

function isMember(characterId: string): boolean {
  return selectedMemberIds.value.includes(characterId)
}

function selectLeader(characterId: string): void {
  selectedLeaderId.value = characterId
  selectedMemberIds.value = selectedMemberIds.value.filter((memberId) => memberId !== characterId)
}

function toggleMember(characterId: string): void {
  if (selectedLeaderId.value === characterId) return

  if (isMember(characterId)) {
    selectedMemberIds.value = selectedMemberIds.value.filter((memberId) => memberId !== characterId)
    return
  }

  if (selectedMemberIds.value.length >= 4) return
  selectedMemberIds.value = [...selectedMemberIds.value, characterId]
}

function openCharacterDetail(character: BattleCharacter): void {
  detailCharacter.value = character
  isDetailDialogOpen.value = true
}

function confirmDeck(): void {
  if (!isDeckComplete.value) return

  const deck = {
    leaderId: selectedLeaderId.value,
    memberIds: [...selectedMemberIds.value],
  }

  saveDeck(deck)
  saveSession(createSession(deck, 'dungeon-select'))
  router.push({ name: 'battle-dungeons' })
}

onMounted(async () => {
  try {
    characters.value = await fetchCharacters()

    const sessionDeck = loadSession()?.deck
    const savedDeck = loadDeck()
    const candidateDeck = sessionDeck ?? savedDeck
    if (candidateDeck) {
      applyDeck([candidateDeck.leaderId, ...candidateDeck.memberIds])
    }
  } catch (error) {
    errorMessage.value = 'バトル用キャラクターデータの取得に失敗しました。'
    console.error(error)
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.character-card {
  border-radius: 18px;
}

.character-avatar {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.18);
  flex-shrink: 0;
}

.character-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>