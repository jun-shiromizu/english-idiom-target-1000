import { describe, expect, it } from 'vitest'
import { advanceBattleTurn, applyActiveSkill, canUseActiveSkill } from '../useBattleSkills'
import type { BattleCharacter, BattleSession } from '@/types'

const characters: BattleCharacter[] = [
  {
    id: 'hero-001',
    name: 'Leader',
    icon: 'battle/icons/characters/hero-001.png',
    atk: 100,
    hp: 1000,
    leaderSkill: {
      id: 'leader-1',
      name: 'Leader Skill',
      effects: [{ effectType: 'atk-multiplier', value: 2 }],
      description: 'leader',
    },
    activeSkill: {
      id: 'skill-heal',
      name: 'Heal',
      effects: [{ effectType: 'heal', value: 0.1 }],
      cooldownTurns: 5,
      description: 'heal',
    },
  },
  {
    id: 'hero-002',
    name: 'Support',
    icon: 'battle/icons/characters/hero-002.png',
    atk: 80,
    hp: 800,
    leaderSkill: {
      id: 'leader-2',
      name: 'Unused',
      effects: [{ effectType: 'atk-multiplier', value: 1 }],
      description: 'unused',
    },
    activeSkill: {
      id: 'skill-boost',
      name: 'Boost',
      effects: [{ effectType: 'skill-boost', value: 1 }],
      cooldownTurns: 4,
      description: 'boost',
    },
  },
]

function createSession(): BattleSession {
  return {
    sessionType: 'battle',
    status: 'in-battle',
    deck: { leaderId: 'hero-001', memberIds: ['hero-002', 'hero-003', 'hero-004', 'hero-005'] },
    dungeonId: 'dungeon-001',
    currentWaveIndex: 0,
    turn: 1,
    score: 0,
    party: [
      { characterId: 'hero-001', currentHp: 500, skillCooldownRemaining: 0 },
      { characterId: 'hero-002', currentHp: 800, skillCooldownRemaining: 2 },
    ],
    enemyCurrentHp: 100,
    activeEffects: [],
  }
}

describe('useBattleSkills', () => {
  it('スキル使用可能か判定できる', () => {
    const session = createSession()
    expect(canUseActiveSkill(session, 'hero-001')).toBe(true)
    expect(canUseActiveSkill(session, 'hero-002')).toBe(false)
  })

  it('回復スキル成功時に HP を回復しクールダウンを再設定する', () => {
    const session = createSession()
    const next = applyActiveSkill(session, characters, 'hero-001', true)

    expect(next.party[0].currentHp).toBe(600)
    expect(next.party[0].skillCooldownRemaining).toBe(5)
  })

  it('skill-boost 成功時に全員のクールダウンを短縮する', () => {
    const session = createSession()
    session.party[1].skillCooldownRemaining = 0

    const next = applyActiveSkill(session, characters, 'hero-002', true)

    expect(next.party[0].skillCooldownRemaining).toBe(0)
    expect(next.party[1].skillCooldownRemaining).toBe(3)
  })

  it('失敗時は効果を適用せずクールダウンだけ再設定する', () => {
    const session = createSession()
    const next = applyActiveSkill(session, characters, 'hero-001', false)

    expect(next.party[0].currentHp).toBe(500)
    expect(next.party[0].skillCooldownRemaining).toBe(5)
    expect(next.activeEffects).toEqual([])
  })

  it('ターン進行で継続効果とクールダウンを進める', () => {
    const session = createSession()
    session.activeEffects = [{ sourceId: 'buff', effectType: 'damage-cut', value: 0.5, remainingTurns: 1 }]
    session.party[0].skillCooldownRemaining = 2

    const next = advanceBattleTurn(session)

    expect(next.turn).toBe(2)
    expect(next.activeEffects).toHaveLength(0)
    expect(next.party[0].skillCooldownRemaining).toBe(1)
    expect(next.party[1].skillCooldownRemaining).toBe(1)
  })
})