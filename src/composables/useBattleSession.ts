import {
  STORAGE_KEY_BATTLE_DECK,
  STORAGE_KEY_BATTLE_SESSION,
} from '@/config'
import type {
  BattleDeck,
  BattlePartyMemberState,
  BattleSession,
  BattleSessionStatus,
} from '@/types'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function normalizeDeck(raw: Partial<BattleDeck> | null | undefined): BattleDeck | null {
  if (!raw || !isNonEmptyString(raw.leaderId) || !Array.isArray(raw.memberIds)) {
    return null
  }

  const memberIds = raw.memberIds.filter(isNonEmptyString)
  const uniqueIds = new Set([raw.leaderId, ...memberIds])
  if (memberIds.length !== 4 || uniqueIds.size !== 5) {
    return null
  }

  return {
    leaderId: raw.leaderId,
    memberIds,
  }
}

function normalizeParty(raw: unknown): BattlePartyMemberState[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const candidate = item as Partial<BattlePartyMemberState>
      if (!isNonEmptyString(candidate.characterId)) return null
      if (typeof candidate.currentHp !== 'number' || typeof candidate.skillCooldownRemaining !== 'number') {
        return null
      }

      return {
        characterId: candidate.characterId,
        currentHp: candidate.currentHp,
        skillCooldownRemaining: candidate.skillCooldownRemaining,
      }
    })
    .filter((item): item is BattlePartyMemberState => item !== null)
}

function normalizeStatus(status: unknown): BattleSessionStatus {
  switch (status) {
    case 'dungeon-select':
    case 'in-battle':
    case 'cleared':
    case 'defeated':
    case 'deck-building':
      return status
    default:
      return 'deck-building'
  }
}

export function useBattleSession() {
  function saveDeck(deck: BattleDeck): void {
    localStorage.setItem(STORAGE_KEY_BATTLE_DECK, JSON.stringify(deck))
  }

  function loadDeck(): BattleDeck | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_BATTLE_DECK)
      if (!raw) return null
      return normalizeDeck(JSON.parse(raw) as Partial<BattleDeck>)
    } catch {
      return null
    }
  }

  function clearDeck(): void {
    localStorage.removeItem(STORAGE_KEY_BATTLE_DECK)
  }

  function createSession(deck: BattleDeck, status: BattleSessionStatus = 'deck-building'): BattleSession {
    return {
      sessionType: 'battle',
      status,
      deck,
      currentWaveIndex: 0,
      turn: 0,
      score: 0,
      party: [],
      enemyCurrentHp: 0,
      activeEffects: [],
    }
  }

  function saveSession(session: BattleSession): void {
    localStorage.setItem(STORAGE_KEY_BATTLE_SESSION, JSON.stringify(session))
  }

  function loadSession(): BattleSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_BATTLE_SESSION)
      if (!raw) return null
      const session = JSON.parse(raw) as Partial<BattleSession>
      const deck = normalizeDeck(session.deck)
      if (!deck) return null

      return {
        sessionType: 'battle',
        status: normalizeStatus(session.status),
        deck,
        dungeonId: isNonEmptyString(session.dungeonId) ? session.dungeonId : undefined,
        currentWaveIndex: typeof session.currentWaveIndex === 'number' ? session.currentWaveIndex : 0,
        turn: typeof session.turn === 'number' ? session.turn : 0,
        score: typeof session.score === 'number' ? session.score : 0,
        party: normalizeParty(session.party),
        enemyCurrentHp: typeof session.enemyCurrentHp === 'number' ? session.enemyCurrentHp : 0,
        activeEffects: Array.isArray(session.activeEffects) ? session.activeEffects : [],
        pendingSkillCharacterId: isNonEmptyString(session.pendingSkillCharacterId)
          ? session.pendingSkillCharacterId
          : undefined,
        lastAttackDamage: typeof session.lastAttackDamage === 'number'
          ? session.lastAttackDamage
          : typeof session.lastFallingGameScore === 'number'
            ? session.lastFallingGameScore
          : undefined,
        lastIncorrectReview:
          session.lastIncorrectReview
          && typeof session.lastIncorrectReview === 'object'
          && isNonEmptyString(session.lastIncorrectReview.question)
          && isNonEmptyString(session.lastIncorrectReview.answer)
            ? {
                question: session.lastIncorrectReview.question,
                answer: session.lastIncorrectReview.answer,
              }
            : undefined,
      }
    } catch {
      return null
    }
  }

  function clearSession(): void {
    localStorage.removeItem(STORAGE_KEY_BATTLE_SESSION)
  }

  return {
    saveDeck,
    loadDeck,
    clearDeck,
    createSession,
    saveSession,
    loadSession,
    clearSession,
  }
}