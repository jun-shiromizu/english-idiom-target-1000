import { describe, expect, it } from 'vitest'
import { applyEnemyAttack, applyPlayerAttack, createInitialBattleSession, getPartyCurrentHp, getPartyMaxHp } from '../useBattleEngine'
import type { BattleCharacter, BattleDeck, BattleDungeon } from '@/types'

const characters: BattleCharacter[] = [
  {
    id: 'hero-001',
    name: 'Leader',
    icon: 'battle/icons/characters/hero-001.png',
    atk: 100,
    hp: 1000,
    leaderSkill: {
      id: 'leader-hard-atk-hp',
      name: 'Leader Skill',
      effects: [
        { effectType: 'atk-multiplier', value: 2 },
        { effectType: 'hp-multiplier', value: 1.5 },
      ],
      description: 'test',
    },
    activeSkill: {
      id: 'skill-1',
      name: 'Skill 1',
      effects: [{ effectType: 'heal', value: 0.1 }],
      cooldownTurns: 5,
      description: 'heal',
    },
  },
  ...Array.from({ length: 4 }, (_, index) => ({
    id: `hero-00${index + 2}`,
    name: `Member ${index + 1}`,
    icon: `battle/icons/characters/hero-00${index + 2}.png`,
    atk: 80,
    hp: 500,
    leaderSkill: {
      id: `member-leader-${index}`,
      name: 'Unused',
      effects: [{ effectType: 'atk-multiplier', value: 1 }],
      description: 'unused',
    },
    activeSkill: {
      id: `member-skill-${index}`,
      name: 'Member Skill',
      effects: [{ effectType: 'damage-cut', value: 0.5, durationTurns: 1 }],
      cooldownTurns: 4,
      description: 'cut',
    },
  })),
]

const deck: BattleDeck = {
  leaderId: 'hero-001',
  memberIds: ['hero-002', 'hero-003', 'hero-004', 'hero-005'],
}

const dungeon: BattleDungeon = {
  id: 'dungeon-001',
  name: 'Test Dungeon',
  enemies: [
    { id: 'slime', name: 'Slime', atk: 30, hp: 15 },
    { id: 'bat', name: 'Bat', atk: 40, hp: 22 },
  ],
}

describe('useBattleEngine', () => {
  it('デッキとダンジョンから初期 battle session を生成できる', () => {
    const session = createInitialBattleSession(deck, dungeon, characters)

    expect(session.status).toBe('in-battle')
    expect(session.turn).toBe(1)
    expect(session.dungeonId).toBe('dungeon-001')
    expect(session.enemyCurrentHp).toBe(15)
    expect(session.party).toHaveLength(5)
    expect(session.party[0].currentHp).toBe(1500)
    expect(session.party[0].skillCooldownRemaining).toBe(5)
    expect(getPartyCurrentHp(session)).toBe(4500)
    expect(getPartyMaxHp(session, characters)).toBe(4500)
  })

  it('攻撃力倍率を反映して敵を倒すと次 wave に進む', () => {
    const session = createInitialBattleSession(deck, dungeon, characters)
    const next = applyPlayerAttack(session, dungeon, 10)

    expect(next.score).toBe(10)
    expect(next.currentWaveIndex).toBe(1)
    expect(next.enemyCurrentHp).toBe(22)
    expect(next.status).toBe('in-battle')
  })

  it('最後の enemy を倒すと clear になる', () => {
    const singleEnemyDungeon: BattleDungeon = {
      id: 'dungeon-boss',
      name: 'Boss Dungeon',
      enemies: [{ id: 'boss', name: 'Boss', atk: 50, hp: 18 }],
    }
    const session = createInitialBattleSession(deck, singleEnemyDungeon, characters)
    const next = applyPlayerAttack(session, singleEnemyDungeon, 10)

    expect(next.status).toBe('cleared')
    expect(next.enemyCurrentHp).toBe(0)
    expect(next.score).toBe(10)
  })

  it('敵ターンで party HP が減少する', () => {
    const session = createInitialBattleSession(deck, dungeon, characters)
    const next = applyEnemyAttack(session, dungeon)

    expect(next.party[0].currentHp).toBe(1470)
    expect(next.status).toBe('in-battle')
  })

  it('damage-cut があると被ダメージを軽減する', () => {
    const session = createInitialBattleSession(deck, dungeon, characters)
    session.activeEffects.push({
      sourceId: 'shield',
      effectType: 'damage-cut',
      value: 0.5,
      remainingTurns: 1,
    })

    const next = applyEnemyAttack(session, dungeon)

    expect(next.party[0].currentHp).toBe(1485)
  })

  it('敵の攻撃で全員の HP が尽きると defeated になる', () => {
    const lethalDungeon: BattleDungeon = {
      id: 'dungeon-lethal',
      name: 'Lethal Dungeon',
      enemies: [{ id: 'boss', name: 'Boss', atk: 9999, hp: 100 }],
    }
    const session = createInitialBattleSession(deck, lethalDungeon, characters)

    const next = applyEnemyAttack(session, lethalDungeon)

    expect(next.status).toBe('defeated')
    expect(next.party.every((member) => member.currentHp === 0)).toBe(true)
  })
})