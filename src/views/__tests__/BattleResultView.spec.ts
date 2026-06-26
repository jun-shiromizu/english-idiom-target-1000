import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import BattleResultView from '../BattleResultView.vue'
import type { BattleSession } from '@/types'

const { mockPush, mockReplace, mockLoadSession } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockReplace: vi.fn(),
  mockLoadSession: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}))

vi.mock('@/composables/useBattleSession', () => ({
  useBattleSession: () => ({
    loadSession: mockLoadSession,
  }),
}))

const vuetify = createVuetify()

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
    lastFallingGameScore: 110,
  }
}

describe('BattleResultView', () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockReplace.mockReset()
    mockLoadSession.mockReset()
  })

  it('セッションが無ければデッキ編成へリダイレクトする', async () => {
    mockLoadSession.mockReturnValue(null)

    mount(BattleResultView, { global: { plugins: [vuetify] } })
    await flushPromises()

    expect(mockReplace).toHaveBeenCalledWith({ name: 'battle-deck' })
  })

  it('結果サマリーに直前の落ち物スコアを表示する', async () => {
    mockLoadSession.mockReturnValue(createSession())

    const wrapper = mount(BattleResultView, { global: { plugins: [vuetify] } })
    await flushPromises()

    expect(wrapper.text()).toContain('ダンジョンクリア')
    expect(wrapper.text()).toContain('直前の落ち物スコア')
    expect(wrapper.text()).toContain('110')
  })

  it('敗北時は直前に間違えた問題と正しい答えを表示する', async () => {
    mockLoadSession.mockReturnValue({
      ...createSession(),
      status: 'defeated',
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