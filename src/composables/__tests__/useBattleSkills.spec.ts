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

  it('クールダウンが 2 なら 2 ターン経過後に再びスキルを使える', () => {
    const session = createSession()
    session.party[0].skillCooldownRemaining = 2

    const afterFirstTurn = advanceBattleTurn(session)
    const afterSecondTurn = advanceBattleTurn(afterFirstTurn)

    expect(canUseActiveSkill(afterFirstTurn, 'hero-001')).toBe(false)
    expect(canUseActiveSkill(afterSecondTurn, 'hero-001')).toBe(true)
  })

  it('回復スキル成功時に HP を回復しクールダウンを再設定する', () => {
    const session = createSession()
    session.party[1].currentHp = 600
    const next = applyActiveSkill(session, characters, 'hero-001', true)

    expect(next.party[0].currentHp).toBe(680)
    expect(next.party[1].currentHp).toBe(600)
    expect(next.party[0].skillCooldownRemaining).toBe(5)
  })

  it('回復スキルはパーティ合計の最大 HP を基準にし、戦闘不能メンバーを除いて不足HPへ配分する', () => {
    const session = createSession()
    session.party[0].currentHp = 1200
    session.party[1].currentHp = 0
    session.activeEffects = [{ sourceId: 'leader', effectType: 'hp-multiplier', value: 1.5, remainingTurns: -1 }]

    const next = applyActiveSkill(session, characters, 'hero-001', true)

    expect(next.party[0].currentHp).toBe(1470)
    expect(next.party[1].currentHp).toBe(0)
  })

  it('skill-boost 成功時に全員の残りクールダウンを 1 短縮し、0 まで下げられる', () => {
    const session = createSession()
    session.party[0].skillCooldownRemaining = 2
    session.party[1].skillCooldownRemaining = 0

    const next = applyActiveSkill(session, characters, 'hero-002', true)

    expect(next.party[0].skillCooldownRemaining).toBe(1)
    expect(next.party[1].skillCooldownRemaining).toBe(3)
  })

  it('skill-boost で残り 1 ターンのスキルは 0 になり再使用可能になる', () => {
    const session = createSession()
    session.party[0].skillCooldownRemaining = 1
    session.party[1].skillCooldownRemaining = 0

    const next = applyActiveSkill(session, characters, 'hero-002', true)

    expect(next.party[0].skillCooldownRemaining).toBe(0)
    expect(canUseActiveSkill(next, 'hero-001')).toBe(true)
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
