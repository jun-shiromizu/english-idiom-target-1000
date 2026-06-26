import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import BattleDungeonView from '../BattleDungeonView.vue'
import type { BattleCharacter, BattleDeck, BattleDungeon, BattleSession } from '@/types'

const {
  mockPush,
  mockReplace,
  mockFetchCharacters,
  mockFetchDungeons,
  mockLoadDeck,
  mockLoadSession,
  mockSaveSession,
  mockCreateInitialBattleSession,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockReplace: vi.fn(),
  mockFetchCharacters: vi.fn(),
  mockFetchDungeons: vi.fn(),
  mockLoadDeck: vi.fn(),
  mockLoadSession: vi.fn(),
  mockSaveSession: vi.fn(),
  mockCreateInitialBattleSession: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}))

vi.mock('@/composables/useBattleData', () => ({
  useBattleData: () => ({
    fetchCharacters: mockFetchCharacters,
    fetchDungeons: mockFetchDungeons,
  }),
}))

vi.mock('@/composables/useBattleSession', () => ({
  useBattleSession: () => ({
    loadDeck: mockLoadDeck,
    loadSession: mockLoadSession,
    saveSession: mockSaveSession,
  }),
}))

vi.mock('@/composables/useBattleEngine', () => ({
  createInitialBattleSession: mockCreateInitialBattleSession,
}))

const vuetify = createVuetify()

const deck: BattleDeck = {
  leaderId: 'hero-001',
  memberIds: ['hero-002', 'hero-003', 'hero-004', 'hero-005'],
}

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
    description: 'sample',
    enemies: [{ id: 'slime', name: 'Slime', atk: 30, hp: 120 }],
  },
]

function createSession(status: BattleSession['status'] = 'dungeon-select'): BattleSession {
  return {
    sessionType: 'battle',
    status,
    deck,
    dungeonId: 'dungeon-001',
    currentWaveIndex: 0,
    turn: 1,
    score: 0,
    party: [],
    enemyCurrentHp: 120,
    activeEffects: [],
  }
}

describe('BattleDungeonView', () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockReplace.mockReset()
    mockFetchCharacters.mockReset()
    mockFetchDungeons.mockReset()
    mockLoadDeck.mockReset()
    mockLoadSession.mockReset()
    mockSaveSession.mockReset()
    mockCreateInitialBattleSession.mockReset()
  })

  it('デッキもセッションも無ければデッキ作成へリダイレクトする', async () => {
    mockLoadSession.mockReturnValue(null)
    mockLoadDeck.mockReturnValue(null)

    mount(BattleDungeonView, { global: { plugins: [vuetify] } })
    await flushPromises()

    expect(mockReplace).toHaveBeenCalledWith({ name: 'battle-deck' })
  })

  it('ダンジョン決定で初期 battle session を保存して battle-play へ遷移する', async () => {
    const initialSession = createSession('in-battle')
    mockLoadSession.mockReturnValue({ ...createSession(), dungeonId: undefined })
    mockLoadDeck.mockReturnValue(deck)
    mockFetchDungeons.mockResolvedValue(dungeons)
    mockFetchCharacters.mockResolvedValue(characters)
    mockCreateInitialBattleSession.mockReturnValue(initialSession)

    const wrapper = mount(BattleDungeonView, { global: { plugins: [vuetify] } })
    await flushPromises()

    const buttons = wrapper.findAll('button')
    const confirmButton = buttons.find((button) => button.text().includes('ダンジョン決定'))
    expect(confirmButton).toBeTruthy()

    await confirmButton!.trigger('click')
    await flushPromises()

    expect(mockCreateInitialBattleSession).toHaveBeenCalledWith(deck, dungeons[0], characters)
    expect(mockSaveSession).toHaveBeenCalledWith(initialSession)
    expect(mockPush).toHaveBeenCalledWith({ name: 'battle-play' })
  })

  it('ダンジョンIDはカード本文に表示し、radio ラベルには出さない', async () => {
    mockLoadSession.mockReturnValue({ ...createSession(), dungeonId: undefined })
    mockLoadDeck.mockReturnValue(deck)
    mockFetchDungeons.mockResolvedValue(dungeons)
    mockFetchCharacters.mockResolvedValue(characters)

    const wrapper = mount(BattleDungeonView, { global: { plugins: [vuetify] } })
    await flushPromises()

    expect(wrapper.text()).toContain('ID: dungeon-001')
    const radioLabel = wrapper.find('.v-label')
    expect(radioLabel.exists()).toBe(false)
  })
})