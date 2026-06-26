import { beforeEach, describe, expect, it } from 'vitest'
import { useBattleSession } from '../useBattleSession'
import type { BattleDeck } from '@/types'

const sampleDeck: BattleDeck = {
  leaderId: 'hero-001',
  memberIds: ['hero-002', 'hero-003', 'hero-004', 'hero-005'],
}

describe('useBattleSession', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('デッキを保存して復元できる', () => {
    const { saveDeck, loadDeck } = useBattleSession()
    saveDeck(sampleDeck)

    expect(loadDeck()).toEqual(sampleDeck)
  })

  it('不正なデッキは復元しない', () => {
    localStorage.setItem(
      'idiom-app-battle-deck',
      JSON.stringify({ leaderId: 'hero-001', memberIds: ['hero-001', 'hero-002'] }),
    )

    const { loadDeck } = useBattleSession()
    expect(loadDeck()).toBeNull()
  })

  it('セッションを保存して復元できる', () => {
    const { createSession, saveSession, loadSession } = useBattleSession()
    const session = createSession(sampleDeck, 'dungeon-select')
    session.dungeonId = 'dungeon-001'
    session.turn = 2
    session.score = 180

    saveSession(session)

    expect(loadSession()).toEqual(session)
  })

  it('clearSession で battle セッションを削除できる', () => {
    const { createSession, saveSession, loadSession, clearSession } = useBattleSession()
    saveSession(createSession(sampleDeck, 'deck-building'))
    clearSession()

    expect(loadSession()).toBeNull()
  })
})