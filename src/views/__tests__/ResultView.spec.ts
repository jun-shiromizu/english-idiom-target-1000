import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import ResultView from '../ResultView.vue'
import type { QuizSession, QuizItem, IdiomData } from '@/types'
import { STORAGE_KEY_SESSION } from '@/config'

// vue-router をモック
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}))

const vuetify = createVuetify()

const mockIdiomData: IdiomData = {
  idioms: ['a piece of ~'],
  means: [{ 'idiom-jp': '１つの～', 'example-sentence': 'example 1', 'sentence-jp': '訳' }],
  notes: [],
}

function makeItem(number: string): QuizItem {
  return {
    number,
    idiomData: mockIdiomData,
    questionText: `idiom ${number}`,
    idiomIndex: 0,
  }
}

function makeSession(results: Record<number, boolean>): QuizSession {
  return {
    settings: {
      bookId: 'idiom-target-1000',
      startNumber: 1,
      endNumber: 3,
      mode: 'idiom',
      target: 'all',
      order: 'sequential',
    },
    items: [makeItem('0001'), makeItem('0002'), makeItem('0003')],
    currentIndex: 3,
    results,
  }
}

describe('ResultView', () => {
  beforeEach(() => {
    localStorage.clear()
    mockPush.mockReset()
  })

  /**
   * リグレッションテスト:
   * 「間違えたところをやり直す」を押したとき、不正解の問題のみが
   * 次のセッション items に含まれること（全問が再出題されるバグの防止）
   */
  it('「間違えたところをやり直す」は不正解の問題のみを items に含むセッションを保存する', async () => {
    // 0001: 正解, 0002: 不正解, 0003: 不正解
    const session = makeSession({ 0: true, 1: false, 2: false })
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session))

    const wrapper = mount(ResultView, { global: { plugins: [vuetify] } })
    await flushPromises()

    const buttons = wrapper.findAll('button')
    const retryBtn = buttons.find((b) => b.text().includes('間違えたところをやり直す'))
    expect(retryBtn, '「間違えたところをやり直す」ボタンが見つからない').toBeTruthy()
    await retryBtn!.trigger('click')

    const saved: QuizSession = JSON.parse(localStorage.getItem(STORAGE_KEY_SESSION)!)
    expect(saved.items).toHaveLength(2)
    expect(saved.items.map((i) => i.number)).toEqual(['0002', '0003'])
    expect(saved.currentIndex).toBe(0)
    expect(saved.results).toEqual({})
    expect(mockPush).toHaveBeenCalledWith({ name: 'quiz' })
  })

  it('全問正解のとき「間違えたところをやり直す」ボタンが無効化される', async () => {
    const session = makeSession({ 0: true, 1: true, 2: true })
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session))

    const wrapper = mount(ResultView, { global: { plugins: [vuetify] } })
    await flushPromises()

    const buttons = wrapper.findAll('button')
    const retryBtn = buttons.find((b) => b.text().includes('間違えたところをやり直す'))
    expect(retryBtn?.attributes('disabled')).toBeDefined()
  })
})
