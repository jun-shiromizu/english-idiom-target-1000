import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import BattleResultView from '../BattleResultView.vue'
import type { BattleCharacter, BattleDungeon, BattleSession } from '@/types'

const {
  mockPush,
  mockReplace,
  mockLoadSession,
  mockFetchCharacters,
  mockFetchDungeons,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockReplace: vi.fn(),
  mockLoadSession: vi.fn(),
  mockFetchCharacters: vi.fn(),
  mockFetchDungeons: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}))

vi.mock('@/composables/useBattleSession', () => ({
  useBattleSession: () => ({
    loadSession: mockLoadSession,
  }),
}))

vi.mock('@/composables/useBattleData', () => ({
  useBattleData: () => ({
    fetchCharacters: mockFetchCharacters,
    fetchDungeons: mockFetchDungeons,
  }),
}))

const vuetify = createVuetify()

const characters: BattleCharacter[] = [
  {
    id: 'hero-001',
    name: '勇者ソロ',
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
  ...Array.from({ length: 4 }, (_, index): BattleCharacter => ({
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

const dungeons: BattleDungeon[] = [
  {
    id: 'dungeon-001',
    name: 'スライムの洞窟',
    enemies: [
      { id: 'slime', name: 'Slime', icon: 'battle/icons/enemies/slime.png', atk: 10, hp: 50 },
      { id: 'bat', name: 'Bat', icon: 'battle/icons/enemies/bat.png', atk: 20, hp: 80 },
    ],
  },
]

function createSession(): BattleSession {
  return {
    sessionType: 'battle',
    status: 'cleared',
    deck: {
      leaderId: 'hero-001',
      memberIds: ['hero-002', 'hero-003', 'hero-004', 'hero-005'],
    },
    dungeonId: 'dungeon-001',
    currentWaveIndex: 1,
    turn: 4,
    score: 220,
    party: [],
    enemyCurrentHp: 0,
    activeEffects: [],
    lastAttackDamage: 110,
  }
}

describe('BattleResultView', () => {
  beforeEach(() => {
    localStorage.clear()
    mockPush.mockReset()
    mockReplace.mockReset()
    mockLoadSession.mockReset()
    mockFetchCharacters.mockReset()
    mockFetchDungeons.mockReset()
    mockFetchCharacters.mockResolvedValue(characters)
    mockFetchDungeons.mockResolvedValue(dungeons)
  })

  it('セッションが無ければデッキ編成へリダイレクトする', async () => {
    mockLoadSession.mockReturnValue(null)

    mount(BattleResultView, { global: { plugins: [vuetify] } })
    await flushPromises()

    expect(mockReplace).toHaveBeenCalledWith({ name: 'battle-deck' })
  })

  it('結果サマリーにダンジョン名、リーダー名、教材設定、敵と味方のアイコンを表示する', async () => {
    localStorage.setItem('idiom-app-settings', JSON.stringify({
      bookId: 'word-target-1900',
      startNumber: 10,
      endNumber: 20,
      mode: 'sentence',
      direction: 'ja-to-en',
      target: 'incorrect',
      order: 'sequential',
    }))
    mockLoadSession.mockReturnValue(createSession())

    const wrapper = mount(BattleResultView, { global: { plugins: [vuetify] } })
    await flushPromises()

    expect(wrapper.text()).toContain('ダンジョンクリア')
    expect(wrapper.text()).toContain('ダンジョン名')
    expect(wrapper.text()).toContain('スライムの洞窟')
    expect(wrapper.text()).toContain('リーダー')
    expect(wrapper.text()).toContain('勇者ソロ')
    expect(wrapper.text()).toContain('教材')
    expect(wrapper.text()).toContain('英単語ターゲット1900')
    expect(wrapper.text()).toContain('開始番号')
    expect(wrapper.text()).toContain('10')
    expect(wrapper.text()).toContain('終了番号')
    expect(wrapper.text()).toContain('20')
    expect(wrapper.text()).toContain('出題形式')
    expect(wrapper.text()).toContain('例文')
    expect(wrapper.text()).toContain('出題方向')
    expect(wrapper.text()).toContain('日本語→英語')
    expect(wrapper.text()).toContain('出題対象')
    expect(wrapper.text()).toContain('間違えたものだけ')
    expect(wrapper.text()).toContain('出題順序')
    expect(wrapper.text()).toContain('番号順')
    expect(wrapper.find('img[alt="Slime icon"]').exists()).toBe(true)
    expect(wrapper.find('img[alt="Bat icon"]').exists()).toBe(true)
    expect(wrapper.find('img[alt="勇者ソロ icon"]').exists()).toBe(true)
    expect(wrapper.find('img[alt="Member 4 icon"]').exists()).toBe(true)
  })

  it('敗北時は直前に間違えた問題と正しい答えを表示する', async () => {
    mockLoadSession.mockReturnValue({
      ...createSession(),
      status: 'defeated',
      currentWaveIndex: 1,
      lastIncorrectReview: {
        question: 'idiom 0003',
        answer: 'かなり多くの〜',
      },
    })

    const wrapper = mount(BattleResultView, { global: { plugins: [vuetify] } })
    await flushPromises()

    expect(wrapper.text()).toContain('バトル敗北')
    expect(wrapper.text()).toContain('直前に間違えた問題')
    expect(wrapper.text()).toContain('問題: idiom 0003')
    expect(wrapper.text()).toContain('正しい答え: かなり多くの〜')
  })
})
