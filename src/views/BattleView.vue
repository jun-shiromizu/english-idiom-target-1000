<template>
  <v-container class="py-8" max-width="920">
    <div v-if="isLoading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-alert v-else-if="errorMessage" type="error" variant="tonal" class="mb-6">
      {{ errorMessage }}
    </v-alert>

    <template v-else-if="session && dungeon">
      <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-3">
        <div>
          <div class="text-caption text-medium-emphasis">WAVE</div>
          <div class="text-h6 font-weight-bold">{{ session.currentWaveIndex + 1 }} / {{ dungeon.enemies.length }}</div>
        </div>
        <div>
          <div class="text-caption text-medium-emphasis">SCORE</div>
          <div class="text-h6 font-weight-bold">{{ session.score }}</div>
        </div>
        <div>
          <div class="text-caption text-medium-emphasis">TURN</div>
          <div class="text-h6 font-weight-bold">{{ session.turn }}</div>
        </div>
        <div class="d-flex align-center ga-1">
          <v-btn v-if="currentScreen === 'game'" variant="text" size="small" @click="togglePause">
            {{ isPaused ? '再開' : '一時停止' }}
          </v-btn>
          <v-btn variant="text" size="small" @click="showQuitDialog = true">中断</v-btn>
        </div>
      </div>

      <v-card v-if="currentScreen === 'command'" class="mb-4">
        <v-card-text>
          <div class="d-flex align-center ga-4 mb-3 flex-wrap">
            <v-avatar size="88" rounded="lg" class="enemy-avatar">
              <img v-if="enemyIconUrl" :src="enemyIconUrl" :alt="`${currentEnemy?.name ?? 'enemy'} icon`" class="enemy-avatar-image" />
              <v-icon v-else icon="mdi-emoticon-devil-outline" size="48" />
            </v-avatar>
            <div>
              <div class="text-h6 font-weight-bold mb-2">{{ currentEnemy?.name ?? '不明な敵' }}</div>
              <div class="text-body-2 text-medium-emphasis">ダンジョン: {{ dungeon.name }}</div>
            </div>
          </div>
          <v-progress-linear color="error" height="16" rounded :model-value="enemyHpPercent">
            <strong class="text-white">HP {{ session.enemyCurrentHp }} / {{ currentEnemy?.hp ?? 0 }}</strong>
          </v-progress-linear>
        </v-card-text>
      </v-card>

      <v-card v-if="currentScreen === 'command'" class="mb-4">
        <v-card-text>
          <v-progress-linear class="mb-4" color="success" height="16" rounded :model-value="partyHpPercent">
            <strong class="text-white">HP {{ partyCurrentHp }} / {{ partyMaxHp }}</strong>
          </v-progress-linear>
          <div class="party-icons mb-4">
            <div v-for="member in partyMembers" :key="member.id" class="party-icon-item">
              <v-badge :model-value="member.isLeader" content="L" color="primary" offset-x="6" offset-y="6">
                <v-btn
                  icon
                  variant="text"
                  class="party-member-button"
                  :class="{ 'party-member-button--ready': member.canUseSkill }"
                  :aria-label="`${member.name} の詳細を開く`"
                  @click="openMemberDetail(member.id)"
                >
                  <v-avatar size="52" rounded="lg" class="party-avatar">
                    <img :src="member.iconUrl" :alt="`${member.name} icon`" class="party-avatar-image" />
                  </v-avatar>
                </v-btn>
              </v-badge>
            </div>
          </div>
          <div class="d-flex flex-wrap ga-2">
            <v-chip v-for="effect in activeEffectSummaries" :key="effect.key" size="small" color="secondary" variant="tonal">
              {{ effect.label }}
            </v-chip>
            <span v-if="activeEffectSummaries.length === 0" class="text-body-2 text-medium-emphasis">発動中の効果はありません</span>
          </div>
        </v-card-text>
      </v-card>

      <v-card>
        <v-card-title v-if="displayScreenTitle" class="text-subtitle-1">{{ displayScreenTitle }}</v-card-title>
        <v-card-text>
          <div class="d-flex flex-wrap ga-2 mb-4">
            <v-chip color="primary" size="small" variant="tonal">落下速度 {{ currentFallSpeed }}</v-chip>
          </div>

          <v-alert v-if="battleMessage" type="info" variant="tonal" class="mb-4">
            {{ battleMessage }}
          </v-alert>

          <template v-if="currentScreen === 'command'">
            <v-alert v-if="lastIncorrectReview" type="warning" variant="tonal" class="mb-4">
              <div class="font-weight-bold mb-1">直前に間違えた問題</div>
              <div class="text-body-2 mb-1">問題: {{ lastIncorrectReview.question }}</div>
              <div class="text-body-2">正しい答え: {{ lastIncorrectReview.answer }}</div>
            </v-alert>

            <p class="text-body-2 text-medium-emphasis mb-4">
              {{ commandScreenDescription }}
            </p>

            <div v-if="session.status !== 'cleared'" class="d-flex flex-wrap ga-2 mb-4">
              <v-btn color="primary" variant="elevated" :disabled="isResolving" @click="startAttackPhase">
                落ち物ゲームスタート
              </v-btn>
            </div>

            <div v-else class="d-flex flex-wrap ga-2 mb-4">
              <v-btn color="primary" variant="elevated" @click="router.push({ name: 'battle-result' })">
                バトル結果へ
              </v-btn>
            </div>
          </template>
          <template v-else>
            <div class="battle-hud mb-4">
              <div class="battle-hud-row mb-3">
                <div class="text-caption text-medium-emphasis">敵: {{ currentEnemy?.name ?? '不明な敵' }}</div>
                <div class="text-caption text-medium-emphasis">味方 HP {{ partyCurrentHp }} / {{ partyMaxHp }}</div>
              </div>
              <v-progress-linear class="mb-2" color="error" height="12" rounded :model-value="enemyHpPercent">
                <strong class="text-white">敵 HP {{ session.enemyCurrentHp }} / {{ currentEnemy?.hp ?? 0 }}</strong>
              </v-progress-linear>
              <v-progress-linear color="success" height="12" rounded :model-value="partyHpPercent">
                <strong class="text-white">味方 HP {{ partyCurrentHp }} / {{ partyMaxHp }}</strong>
              </v-progress-linear>
            </div>

            <p class="text-body-2 text-medium-emphasis mb-4">
              {{ gameScreenDescription }}
            </p>

            <template v-if="isPaused">
              <section class="play-field paused-field d-flex align-center justify-center mb-4">
                <div class="text-center">
                  <div class="text-subtitle-1 font-weight-bold mb-2">一時停止中</div>
                  <v-btn color="primary" variant="elevated" @click="togglePause">再開する</v-btn>
                </div>
              </section>
            </template>
            <template v-else>
              <section class="play-field mb-4" aria-live="polite">
                <div v-if="gameBackdropIconUrl" class="play-field-focus">
                  <img :src="gameBackdropIconUrl" :alt="gameBackdropIconAlt" class="play-field-focus__image" />
                </div>
                <div class="danger-line" />
                <div v-if="currentAttackItem" class="falling-word" :style="fallingWordStyle">
                  <span class="text-caption text-medium-emphasis">No.{{ currentAttackItem.number }}</span>
                  <strong>{{ currentAttackItem.questionText }}</strong>
                </div>
              </section>

              <div v-if="!isSkillChallenge" class="damage-strip mb-4">
                <span class="text-caption text-medium-emphasis">現在の与ダメージ</span>
                <strong class="damage-strip__value">{{ projectedDamage }}</strong>
                <span class="text-caption text-medium-emphasis">
                  {{ currentComboCount }} コンボ
                </span>
              </div>

              <div class="choice-grid mb-2">
                <v-btn
                  v-for="choice in attackChoices"
                  :key="choice.label"
                  class="choice-button text-none"
                  color="primary"
                  variant="outlined"
                  :disabled="isResolving || !currentAttackItem"
                  @click="answerAttack(choice.correct)"
                >
                  {{ choice.label }}
                </v-btn>
              </div>
            </template>
          </template>
        </v-card-text>
        <v-card-actions>
          <v-btn v-if="currentScreen === 'game'" variant="text" @click="returnToCommandScreen">コマンドへ戻る</v-btn>
          <v-spacer />
          <v-btn variant="text" @click="router.push({ name: 'battle-dungeons' })">ダンジョン選択へ戻る</v-btn>
          <v-btn color="primary" variant="elevated" @click="router.push({ name: 'home' })">トップへ</v-btn>
        </v-card-actions>
      </v-card>
    </template>
  </v-container>

  <v-dialog v-model="showQuitDialog" max-width="360">
    <v-card>
      <v-card-title>バトルを中断しますか？</v-card-title>
      <v-card-text>現在のバトル進行は保存済みです。あとでホームから再開できます。</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="showQuitDialog = false">続ける</v-btn>
        <v-btn color="primary" variant="elevated" @click="quitBattle">トップへ</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showMemberDetailDialog" max-width="480">
    <v-card v-if="selectedMemberDetail">
      <v-card-title>{{ selectedMemberDetail.name }}</v-card-title>
      <v-card-text>
        <div class="member-skill-section">
          <div class="text-subtitle-2 font-weight-bold mb-2">リーダースキル: {{ selectedMemberDetail.leaderSkillName }}</div>
          <div class="text-body-2">{{ selectedMemberDetail.leaderSkillDescription }}</div>
        </div>

        <div class="member-skill-section">
          <div class="text-subtitle-2 font-weight-bold mb-2">スキル: {{ selectedMemberDetail.activeSkillName }}</div>
          <div class="text-body-2 mb-2">残り {{ selectedMemberDetail.skillCooldownRemaining }} ターン</div>
          <div class="text-body-2">{{ selectedMemberDetail.activeSkillDescription }}</div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" @click="closeMemberDetail">閉じる</v-btn>
        <v-spacer />
        <v-btn
          v-if="selectedMemberDetail.canUseSkill"
          color="secondary"
          variant="elevated"
          :disabled="isResolving"
          @click="triggerSkillChallenge(selectedMemberDetail.id)"
        >
          {{ selectedMemberDetail.activeSkillName }} を使う
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { advanceBattleTurn, applyActiveSkill, canUseActiveSkill } from '@/composables/useBattleSkills'
import {
  applyEnemyAttack,
  applyPlayerAttack,
  calculateBattleDamage,
  getCurrentEnemy,
  getPartyCurrentHp,
  getPartyMaxHp,
} from '@/composables/useBattleEngine'
import { useBattleData } from '@/composables/useBattleData'
import { getGameAnswerLabel, useGameChoices, type GameChoice } from '@/composables/useGameChoices'
import { useGitHubData } from '@/composables/useGitHubData'
import { useQuizSession } from '@/composables/useQuizSession'
import { useBattleSession } from '@/composables/useBattleSession'
import { BOOK_ORDER, DEFAULT_BOOK_ID, STORAGE_KEY_SETTINGS, buildBattleGitHubRawBase, getBookConfig } from '@/config'
import type { BattleCharacter, BattleDungeon, BattleSession, BattleSkillEffect, QuizItem, QuizSettings } from '@/types'

type BattleScreen = 'command' | 'game'

const router = useRouter()
const { loadSession, saveSession } = useBattleSession()
const { fetchCharacters, fetchDungeons } = useBattleData()
const { fetchRangeData } = useGitHubData()
const { buildItems } = useQuizSession()
const { buildGameChoices } = useGameChoices()
const session = ref<BattleSession | null>(null)
const characters = ref<BattleCharacter[]>([])
const dungeon = ref<BattleDungeon | null>(null)
const attackItems = ref<QuizItem[]>([])
const currentAttackItem = ref<QuizItem | null>(null)
const attackChoices = ref<GameChoice[]>([])
const fallY = ref(24)
const currentComboCount = ref(0)
const lastIncorrectReview = ref<{ question: string; answer: string } | null>(null)
const isLoading = ref(true)
const isResolving = ref(false)
const isPaused = ref(false)
const showQuitDialog = ref(false)
const errorMessage = ref('')
const battleMessage = ref('')
const currentScreen = ref<BattleScreen>('command')
const battleRawBase = buildBattleGitHubRawBase()
const showMemberDetailDialog = ref(false)
const selectedMemberId = ref<string | null>(null)
let animationFrame = 0
let previousFrameTime = 0

const FIELD_HEIGHT = 320
const WORD_HEIGHT = 96
const START_FALL_Y = 24
const DEFAULT_FALL_SPEED = 28

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
    mode: raw?.mode ?? defaults.mode,
    direction: raw?.direction === 'ja-to-en' ? 'ja-to-en' : defaults.direction,
    target: 'all',
    order: raw?.order ?? defaults.order,
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

function getActiveFallSpeed(activeDungeon: BattleDungeon | null, activeSession: BattleSession | null): number {
  const base = activeDungeon?.fallSpeed ?? DEFAULT_FALL_SPEED
  if (!activeSession) return base
  const delta = activeSession.activeEffects
    .filter((effect) => effect.effectType === 'game-difficulty' && typeof effect.value === 'number')
    .reduce((sum, effect) => sum + (effect.value as number), 0)
  return Math.max(1, base + delta)
}

const currentEnemy = computed(() => (session.value && dungeon.value ? getCurrentEnemy(session.value, dungeon.value) : null))
const enemyHpPercent = computed(() => {
  if (!session.value || !currentEnemy.value || currentEnemy.value.hp <= 0) return 0
  return Math.max(0, Math.min(100, (session.value.enemyCurrentHp / currentEnemy.value.hp) * 100))
})
const partyCurrentHp = computed(() => (session.value ? getPartyCurrentHp(session.value) : 0))
const partyMaxHp = computed(() => (session.value ? getPartyMaxHp(session.value, characters.value) : 0))
const partyHpPercent = computed(() => {
  if (partyMaxHp.value <= 0) return 0
  return Math.max(0, Math.min(100, (partyCurrentHp.value / partyMaxHp.value) * 100))
})
const maxFallY = computed(() => FIELD_HEIGHT - WORD_HEIGHT - 12)
const fallingWordStyle = computed(() => ({
  transform: `translate3d(0, ${fallY.value}px, 0)`,
}))
const currentFallSpeed = computed(() => getActiveFallSpeed(dungeon.value, session.value))
const projectedDamage = computed(() => {
  if (!session.value) return 0
  return calculateBattleDamage(session.value, characters.value, currentComboCount.value)
})
const isSkillChallenge = computed(() => Boolean(session.value?.pendingSkillCharacterId))
const enemyIconUrl = computed(() => {
  if (!currentEnemy.value?.icon) return ''
  return resolveBattleAsset(currentEnemy.value.icon)
})
const skillChallengeMember = computed(() => {
  if (!session.value?.pendingSkillCharacterId) return null
  return characters.value.find((entry) => entry.id === session.value?.pendingSkillCharacterId) ?? null
})
const gameBackdropIconUrl = computed(() => {
  if (isSkillChallenge.value) {
    return skillChallengeMember.value ? resolveCharacterIcon(skillChallengeMember.value.icon) : ''
  }

  return enemyIconUrl.value
})
const gameBackdropIconAlt = computed(() =>
  isSkillChallenge.value
    ? `${skillChallengeMember.value?.name ?? 'member'} icon`
    : `${currentEnemy.value?.name ?? 'enemy'} icon`,
)
const commandScreenTitle = computed(() => (session.value?.status === 'cleared' ? 'ダンジョンクリア' : ''))
const commandScreenDescription = computed(() =>
  session.value?.status === 'cleared'
    ? '最後の敵を倒しました。結果画面へ進んで戦績を確認してください。'
    : 'スキルを使うか、このまま落ち物ゲームを始めるかを選びます。準備ができたら「落ち物ゲームスタート」を押してください。',
)
const gameScreenTitle = computed(() => (isSkillChallenge.value ? 'スキルチャレンジ' : '落ち物ゲーム'))
const displayScreenTitle = computed(() =>
  currentScreen.value === 'command' ? commandScreenTitle.value : gameScreenTitle.value,
)
const gameScreenDescription = computed(() =>
  isSkillChallenge.value
    ? '4択に正解するとスキルが発動します。時間制限はなく、回答するまでは進行しません。'
    : '正解している間は落ち物ゲームが続き、失敗した時点のコンボ数からダメージを計算します。',
)
const hpMultiplier = computed(() => {
  if (!session.value) return 1
  const baseHp = session.value.party.reduce((sum, member) => {
    const character = characters.value.find((entry) => entry.id === member.characterId)
    return sum + (character?.hp ?? 0)
  }, 0)
  if (baseHp <= 0) return 1
  return partyMaxHp.value / baseHp
})
const activeEffectSummaries = computed(() => {
  if (!session.value) return []
  return session.value.activeEffects.map((effect, index) => ({
    key: `${effect.sourceId}-${effect.effectType}-${index}`,
    label: formatEffectLabel(effect.effectType, effect.value, effect.remainingTurns),
  }))
})
const partyMembers = computed(() => {
  if (!session.value) return []
  const activeSession = session.value

  return activeSession.party
    .map((memberState) => {
      const character = characters.value.find((entry) => entry.id === memberState.characterId)
      if (!character) return null

      return {
        id: character.id,
        name: character.name,
        iconUrl: resolveCharacterIcon(character.icon),
        isLeader: character.id === activeSession.deck.leaderId,
        currentHp: memberState.currentHp,
        maxHp: Math.round(character.hp * hpMultiplier.value),
        skillCooldownRemaining: memberState.skillCooldownRemaining,
        canUseSkill: canUseActiveSkill(activeSession, character.id),
        leaderSkillName: character.leaderSkill.name,
        leaderSkillDescription: character.leaderSkill.description,
        activeSkillName: character.activeSkill.name,
        activeSkillDescription: character.activeSkill.description,
      }
    })
    .filter((member): member is {
      id: string
      name: string
      iconUrl: string
      isLeader: boolean
      currentHp: number
      maxHp: number
      skillCooldownRemaining: number
      canUseSkill: boolean
      leaderSkillName: string
      leaderSkillDescription: string
      activeSkillName: string
      activeSkillDescription: string
    } => member !== null)
})
const selectedMemberDetail = computed(() =>
  selectedMemberId.value
    ? partyMembers.value.find((member) => member.id === selectedMemberId.value) ?? null
    : null,
)

function resolveCharacterIcon(iconPath: string): string {
  return resolveBattleAsset(iconPath)
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

function formatEffectLabel(effectType: BattleSession['activeEffects'][number]['effectType'], value: BattleSession['activeEffects'][number]['value'], remainingTurns: number): string {
  switch (effectType) {
    case 'atk-multiplier':
      return `攻撃 x${value} (${remainingTurns}T)`
    case 'combo-constant':
      return `コンボ定数 ${value} (${remainingTurns}T)`
    case 'hp-multiplier':
      return `HP x${value} (${remainingTurns}T)`
    case 'game-difficulty': {
      const delta = typeof value === 'number' ? value : 0
      const sign = delta >= 0 ? '+' : ''
      return `落下速度 ${sign}${delta} (${remainingTurns}T)`
    }
    case 'heal':
      return `回復 ${value} (${remainingTurns}T)`
    case 'damage-cut':
      return `被ダメ ${value}倍 (${remainingTurns}T)`
    case 'skill-boost':
      return `CT短縮 ${value} (${remainingTurns}T)`
    default:
      return `${effectType} (${remainingTurns}T)`
  }
}

function formatSkillEffectMessage(
  effect: BattleSkillEffect,
  healedAmount: number,
): string | null {
  switch (effect.effectType) {
    case 'heal':
      return `パーティのHPが ${healedAmount} 回復しました。`
    case 'atk-multiplier':
      return typeof effect.value === 'number'
        ? `パーティの攻撃力が ${effect.value} 倍になりました。`
        : null
    case 'damage-cut':
      return typeof effect.value === 'number'
        ? `ダメージが ${effect.value} 倍になります。`
        : null
    case 'skill-boost':
      return typeof effect.value === 'number'
        ? `スキルターンが ${Math.round(effect.value)} ターン減りました。`
        : null
    case 'game-difficulty':
      if (typeof effect.value !== 'number') return null
      if (effect.value < 0) return `落下速度が ${Math.abs(effect.value)} 遅くなりました。`
      if (effect.value > 0) return `落下速度が ${effect.value} 速くなりました。`
      return null
    default:
      return null
  }
}

function buildSkillSuccessMessage(
  character: BattleCharacter | null,
  beforeSession: BattleSession,
  afterSession: BattleSession,
): string {
  const skillName = character?.activeSkill.name ?? 'スキル'
  const healedAmount = Math.max(0, getPartyCurrentHp(afterSession) - getPartyCurrentHp(beforeSession))
  const effectMessages = (character?.activeSkill.effects ?? [])
    .map((effect) => formatSkillEffectMessage(effect, healedAmount))
    .filter((message): message is string => Boolean(message))

  return [`${skillName} が発動しました。`, ...effectMessages].join(' ')
}

function openMemberDetail(memberId: string): void {
  selectedMemberId.value = memberId
  showMemberDetailDialog.value = true
}

function closeMemberDetail(): void {
  showMemberDetailDialog.value = false
  selectedMemberId.value = null
}

function setNextAttackItem(): void {
  if (attackItems.value.length < 4) {
    currentAttackItem.value = null
    attackChoices.value = []
    return
  }

  const nextItem = attackItems.value[Math.floor(Math.random() * attackItems.value.length)]
  currentAttackItem.value = nextItem
  attackChoices.value = buildGameChoices(nextItem, attackItems.value)
  fallY.value = START_FALL_Y
}

function tick(time: number) {
  if (!session.value || currentScreen.value !== 'game' || !currentAttackItem.value || isResolving.value || isPaused.value) {
    animationFrame = requestAnimationFrame(tick)
    return
  }

  if (!previousFrameTime) previousFrameTime = time
  const delta = Math.min((time - previousFrameTime) / 1000, 0.05)
  previousFrameTime = time
  fallY.value += currentFallSpeed.value * delta

  if (fallY.value >= maxFallY.value) {
    void resolveTurn(false)
  }

  animationFrame = requestAnimationFrame(tick)
}

async function resolveTurn(correct: boolean): Promise<void> {
  if (!session.value || !dungeon.value || isResolving.value) return
  isResolving.value = true

  const answeredItem = currentAttackItem.value

  if (session.value.pendingSkillCharacterId) {
    const beforeSkillSession = session.value
    const skillUser = characters.value.find((entry) => entry.id === session.value?.pendingSkillCharacterId)
    const skillName = skillUser?.activeSkill.name ?? 'スキル'
    const nextSession = applyActiveSkill(
      session.value,
      characters.value,
      session.value.pendingSkillCharacterId,
      correct,
    )
    session.value = {
      ...nextSession,
      pendingSkillCharacterId: undefined,
    }
    saveSession(session.value)
    battleMessage.value = correct
      ? buildSkillSuccessMessage(skillUser ?? null, beforeSkillSession, session.value)
      : `${skillName} の発動に失敗しました。`
    returnToCommandScreen()
    isResolving.value = false
    return
  }

  if (correct) {
    currentComboCount.value += 1
    lastIncorrectReview.value = null
    battleMessage.value = `正解。現在 ${currentComboCount.value} コンボ、与ダメージは ${projectedDamage.value} です。失敗するまで続きます。`
    setNextAttackItem()
    isResolving.value = false
    return
  }

  if (answeredItem) {
    lastIncorrectReview.value = {
      question: answeredItem.questionText,
      answer: getGameAnswerLabel(answeredItem),
    }
  }

  const comboCount = currentComboCount.value
  const attackDamage = calculateBattleDamage(session.value, characters.value, comboCount)
  const defeatedEnemy = currentEnemy.value
  const previousWaveIndex = session.value.currentWaveIndex
  const attackSummary = defeatedEnemy
    ? `${comboCount} コンボの攻撃、${defeatedEnemy.name} に ${attackDamage} のダメージ。`
    : `${comboCount} コンボの攻撃、敵に ${attackDamage} のダメージ。`

  battleMessage.value = attackSummary

  let nextSession = applyPlayerAttack(session.value, dungeon.value, attackDamage)
  nextSession = {
    ...nextSession,
    lastAttackDamage: attackDamage,
    lastIncorrectReview: lastIncorrectReview.value ?? undefined,
  }

  const defeatedEnemyByAttack = Boolean(
    defeatedEnemy && (nextSession.status === 'cleared' || nextSession.currentWaveIndex !== previousWaveIndex),
  )

  if (nextSession.status === 'cleared') {
    battleMessage.value = defeatedEnemy
      ? `${attackSummary} ${defeatedEnemy.name} を倒した。ダンジョンクリアです。`
      : `${attackSummary} 最後の敵を倒した。ダンジョンクリアです。`
    nextSession = advanceBattleTurn(nextSession)
    session.value = nextSession
    saveSession(nextSession)
    returnToCommandScreen()
    isResolving.value = false
    return
  }

  if (defeatedEnemyByAttack) {
    const nextEnemy = getCurrentEnemy(nextSession, dungeon.value)
    battleMessage.value = defeatedEnemy && nextEnemy
      ? `${attackSummary} ${defeatedEnemy.name} を倒した。次は ${nextEnemy.name} です。`
      : `${attackSummary} 敵を倒した。次の敵へ進みます。`
    nextSession = advanceBattleTurn(nextSession)
    session.value = nextSession
    saveSession(nextSession)
    returnToCommandScreen()
    isResolving.value = false
    return
  }

  const partyHpBeforeEnemyAttack = getPartyCurrentHp(nextSession)
  nextSession = applyEnemyAttack(nextSession, dungeon.value)
  const enemyCounterDamage = Math.max(0, partyHpBeforeEnemyAttack - getPartyCurrentHp(nextSession))
  const enemyName = currentEnemy.value?.name ?? '敵'
  battleMessage.value += ` ${enemyName} の反撃、パーティに ${enemyCounterDamage} のダメージ。`

  if (nextSession.status === 'defeated') {
    session.value = nextSession
    saveSession(nextSession)
    isResolving.value = false
    await router.push({ name: 'battle-result' })
    return
  }

  nextSession = advanceBattleTurn(nextSession)

  session.value = nextSession
  saveSession(nextSession)
  returnToCommandScreen()
  isResolving.value = false
}

function answerAttack(correct: boolean): void {
  if (currentScreen.value !== 'game' || isPaused.value) return
  void resolveTurn(correct)
}

function startAttackPhase(): void {
  if (isResolving.value) return
  currentComboCount.value = 0
  lastIncorrectReview.value = null
  battleMessage.value = '落ち物ゲームを開始します。失敗するまで続きます。'
  currentScreen.value = 'game'
  isPaused.value = false
  previousFrameTime = 0
  setNextAttackItem()
}

function startSkillChallenge(characterId: string): void {
  if (!session.value || isResolving.value || isPaused.value || !canUseActiveSkill(session.value, characterId)) return
  lastIncorrectReview.value = null
  session.value = {
    ...session.value,
    pendingSkillCharacterId: characterId,
  }
  saveSession(session.value)
  battleMessage.value = '4択に正解するとスキルが発動します。'
  currentScreen.value = 'game'
  isPaused.value = false
  previousFrameTime = 0
  setNextAttackItem()
}

function triggerSkillChallenge(characterId: string): void {
  closeMemberDetail()
  startSkillChallenge(characterId)
}

function returnToCommandScreen(): void {
  currentScreen.value = 'command'
  currentComboCount.value = 0
  isPaused.value = false
  previousFrameTime = 0
  currentAttackItem.value = null
  attackChoices.value = []
  fallY.value = START_FALL_Y
}

function shouldRefreshOpeningBattleState(activeSession: BattleSession): boolean {
  return activeSession.status === 'in-battle'
    && activeSession.turn <= 1
    && activeSession.score === 0
}

function togglePause(): void {
  if (currentScreen.value !== 'game') return
  isPaused.value = !isPaused.value
  if (!isPaused.value) {
    previousFrameTime = performance.now()
  }
}

function quitBattle(): void {
  if (session.value) {
    saveSession(session.value)
  }
  showQuitDialog.value = false
  router.push({ name: 'home' })
}

onMounted(() => {
  void (async () => {
    let loaded = loadSession()
    if (!loaded?.deck || !loaded.dungeonId) {
      router.replace({ name: 'battle-deck' })
      return
    }

    const activeSession = loaded

    try {
      const attackSettings = loadAttackSettings()
      const [{ dataMap }, loadedCharacters, loadedDungeons] = await Promise.all([
        fetchRangeData(attackSettings.bookId, attackSettings.startNumber, attackSettings.endNumber),
        fetchCharacters(),
        fetchDungeons(),
      ])
      const loadedDungeon = loadedDungeons.find((entry) => entry.id === activeSession.dungeonId)
      if (!loadedDungeon) {
        errorMessage.value = '選択中のダンジョンデータが見つかりません。'
        return
      }

      const items = buildItems(attackSettings, dataMap)
      if (items.length < 4) {
        errorMessage.value = 'バトル攻撃用の問題が 4 問未満です。トップの出題設定を調整してください。'
        return
      }

      attackItems.value = items
      characters.value = loadedCharacters
      dungeon.value = loadedDungeon

      if (shouldRefreshOpeningBattleState(activeSession)) {
        const enemy = loadedDungeon.enemies[activeSession.currentWaveIndex]
        if (enemy) {
          loaded = {
            ...activeSession,
            enemyCurrentHp: enemy.hp,
          }
          saveSession(loaded)
        }
      } else {
        loaded = activeSession
      }

      session.value = loaded
      animationFrame = requestAnimationFrame(tick)
    } catch (error) {
      errorMessage.value = 'バトルデータの読み込みに失敗しました。'
      console.error(error)
    } finally {
      isLoading.value = false
    }
  })()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
})
</script>

<style scoped>
.play-field {
  position: relative;
  height: 320px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  background:
    linear-gradient(rgba(var(--v-theme-primary), 0.05), transparent 42%),
    rgb(var(--v-theme-surface));
}

.play-field-focus {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 0;
  width: 104px;
  height: 104px;
  padding: 6px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 16px;
  background: rgba(var(--v-theme-surface), 0.24);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.14);
  backdrop-filter: blur(6px);
  opacity: 0.32;
}

.play-field-focus__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 12px;
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
  z-index: 1;
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
  font-size: clamp(1.1rem, 4vw, 1.8rem);
  line-height: 1.25;
}

.choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.damage-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 10px;
  background: rgba(var(--v-theme-primary), 0.04);
}

.damage-strip__value {
  color: rgb(var(--v-theme-error));
  font-size: 1.25rem;
  line-height: 1;
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

.party-icons {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  justify-content: center;
  gap: 10px;
  overflow: hidden;
}

.party-icon-item {
  flex: 0 0 56px;
  width: 56px;
}

.party-member-button {
  width: 56px;
  height: 56px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.16);
  border-radius: 16px;
}

.party-member-button--ready {
  border-width: 3px;
  border-color: rgb(var(--v-theme-secondary));
  background: rgba(var(--v-theme-secondary), 0.08);
}

.party-avatar {
  width: 52px;
  height: 52px;
  margin: 0 auto;
}

.party-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.member-skill-section + .member-skill-section {
  margin-top: 20px;
}

.enemy-avatar {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.16);
  background: rgba(var(--v-theme-surface-variant), 0.28);
}

.enemy-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.battle-hud {
  padding: 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.05);
}

.battle-hud-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 600px) {
  .damage-strip {
    flex-wrap: wrap;
  }

  .party-icons {
    gap: 6px;
  }

  .party-icon-item {
    flex-basis: 52px;
    width: 52px;
  }

  .party-avatar {
    width: 48px;
    height: 48px;
  }

}
</style>
