import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import BattleDeckView from '../BattleDeckView.vue'
import { buildBattleGitHubRawBase } from '@/config'
import type { BattleCharacter, BattleDeck, BattleSession } from '@/types'

const {
  mockPush,
  mockFetchCharacters,
  mockLoadDeck,
  mockLoadSession,
  mockSaveDeck,
  mockSaveSession,
  mockCreateSession,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockFetchCharacters: vi.fn(),
  mockLoadDeck: vi.fn(),
  mockLoadSession: vi.fn(),
  mockSaveDeck: vi.fn(),
  mockSaveSession: vi.fn(),
  mockCreateSession: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/composables/useBattleData', () => ({
  useBattleData: () => ({
    fetchCharacters: mockFetchCharacters,
  }),
}))

vi.mock('@/composables/useBattleSession', () => ({
  useBattleSession: () => ({
    loadDeck: mockLoadDeck,
    loadSession: mockLoadSession,
    saveDeck: mockSaveDeck,
    saveSession: mockSaveSession,
    createSession: mockCreateSession,
  }),
}))

const vuetify = createVuetify()

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
  ...Array.from({ length: 4 }, (_, index) => ({
    id: `hero-00${index + 2}`,
    name: `Member ${index + 1}`,
    icon: `battle/icons/characters/hero-00${index + 2}.png`,
    atk: 80,
    hp: 500,
    leaderSkill: {
      id: `leader-${index + 2}`,
      name: 'Unused',
      effects: [{ effectType: 'atk-multiplier', value: 1 }],
      description: 'unused',
    },
    activeSkill: {
      id: `skill-${index + 2}`,
      name: `Member Skill ${index + 1}`,
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

function createSession(): BattleSession {
  return {
    sessionType: 'battle',
    status: 'dungeon-select',
    deck,
    currentWaveIndex: 0,
    turn: 1,
    score: 0,
    party: [],
    enemyCurrentHp: 0,
    activeEffects: [],
  }
}

describe('BattleDeckView', () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockFetchCharacters.mockReset()
    mockLoadDeck.mockReset()
    mockLoadSession.mockReset()
    mockSaveDeck.mockReset()
    mockSaveSession.mockReset()
    mockCreateSession.mockReset()

    vi.stubGlobal('visualViewport', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      width: 1280,
      height: 720,
      offsetTop: 0,
      offsetLeft: 0,
      pageTop: 0,
      pageLeft: 0,
      scale: 1,
    })
  })

  it('リーダー1人とメンバー4人が揃うまでデッキ決定は無効', async () => {
    mockFetchCharacters.mockResolvedValue(characters)
    mockLoadDeck.mockReturnValue(null)
    mockLoadSession.mockReturnValue(null)

    const wrapper = mount(BattleDeckView, { global: { plugins: [vuetify] } })
    await flushPromises()

    const buttons = wrapper.findAll('button')
    const confirmButton = buttons.find((button) => button.text().includes('デッキ決定'))
    expect(confirmButton).toBeTruthy()
    expect(confirmButton!.attributes('disabled')).toBeDefined()
  })

  it('デッキ決定で保存してダンジョン選択へ遷移する', async () => {
    const createdSession = createSession()
    mockFetchCharacters.mockResolvedValue(characters)
    mockLoadDeck.mockReturnValue(deck)
    mockLoadSession.mockReturnValue(null)
    mockCreateSession.mockReturnValue(createdSession)

    const wrapper = mount(BattleDeckView, { global: { plugins: [vuetify] } })
    await flushPromises()

    const confirmButton = wrapper.findAll('button').find((button) => button.text().includes('デッキ決定'))
    expect(confirmButton?.attributes('disabled')).toBeUndefined()

    await confirmButton!.trigger('click')
    await flushPromises()

    expect(mockSaveDeck).toHaveBeenCalledWith(deck)
    expect(mockCreateSession).toHaveBeenCalledWith(deck, 'dungeon-select')
    expect(mockSaveSession).toHaveBeenCalledWith(createdSession)
    expect(mockPush).toHaveBeenCalledWith({ name: 'battle-dungeons' })
  })

  it('キャラクターアイコンを battle データの Raw URL で表示する', async () => {
    mockFetchCharacters.mockResolvedValue(characters)
    mockLoadDeck.mockReturnValue(null)
    mockLoadSession.mockReturnValue(null)

    const wrapper = mount(BattleDeckView, { global: { plugins: [vuetify] } })
    await flushPromises()

    const iconImage = wrapper.find('img[alt="Leader icon"]')
    expect(iconImage.exists()).toBe(true)
    expect(iconImage.attributes('src')).toBe(
      `${buildBattleGitHubRawBase()}/battle/icons/characters/hero-001.png`,
    )
  })

  it('詳細ボタンでスキル説明ダイアログを開ける', async () => {
    mockFetchCharacters.mockResolvedValue(characters)
    mockLoadDeck.mockReturnValue(null)
    mockLoadSession.mockReturnValue(null)

    const wrapper = mount(BattleDeckView, { attachTo: document.body, global: { plugins: [vuetify] } })
    await flushPromises()

    const detailButton = wrapper.findAll('button').find((button) => button.text().includes('詳細'))
    expect(detailButton).toBeTruthy()

    await detailButton!.trigger('click')
    await flushPromises()

    expect(document.body.textContent ?? '').toContain('リーダースキル: Leader Skill')
    expect(document.body.textContent ?? '').toContain('leader')
    expect(document.body.textContent ?? '').toContain('スキル: Skill 1')
    expect(document.body.textContent ?? '').toContain('heal')

    wrapper.unmount()
  })
})