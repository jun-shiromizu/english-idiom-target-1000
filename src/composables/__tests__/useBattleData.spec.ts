import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetBattleDataCaches, useBattleData } from '../useBattleData'
import type { BattleCharacter, BattleDungeon } from '@/types'

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
      effects: [{ effectType: 'atk-multiplier', value: 1.5 }],
      description: 'leader',
    },
    activeSkill: {
      id: 'skill-1',
      name: 'Skill 1',
      effects: [{ effectType: 'heal', value: 0.1 }],
      cooldownTurns: 3,
      description: 'heal',
    },
  },
]

const dungeons: BattleDungeon[] = [
  {
    id: 'dungeon-001',
    name: 'Test Dungeon',
    enemies: [{ id: 'slime', name: 'Slime', atk: 30, hp: 120 }],
  },
]

describe('useBattleData', () => {
  beforeEach(() => {
    resetBattleDataCaches()
    vi.restoreAllMocks()
  })

  it('fetchCharacters は取得結果をキャッシュする', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(characters),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { fetchCharacters } = useBattleData()

    const first = await fetchCharacters()
    const second = await fetchCharacters()

    expect(first).toEqual(characters)
    expect(second).toEqual(characters)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fetchDungeons は並行呼び出しでも 1 回だけ取得する', async () => {
    let resolveText: ((value: string) => void) | null = null
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        new Promise<string>((resolve) => {
          resolveText = resolve
        }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { fetchDungeons } = useBattleData()
    const firstPromise = fetchDungeons()
    const secondPromise = fetchDungeons()
    await Promise.resolve()

    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolveText?.(JSON.stringify(dungeons))

    await expect(firstPromise).resolves.toEqual(dungeons)
    await expect(secondPromise).resolves.toEqual(dungeons)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
