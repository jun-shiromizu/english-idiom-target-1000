import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import GameView from '../GameView.vue'
import type { IdiomData, QuizItem, QuizSession } from '@/types'
import { STORAGE_KEY_GAME_SETTINGS, STORAGE_KEY_SESSION } from '@/config'

const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}))

const vuetify = createVuetify()

const mockIdiomData: IdiomData = {
  idioms: ['a piece of ~'],
  means: [{ 'idiom-jp': '１つの～', 'example-sentence': 'example', 'sentence-jp': '訳' }],
  notes: [],
}

function makeItem(number: string): QuizItem {
  return {
    number,
    idiomData: mockIdiomData,
    questionText: `question ${number}`,
    idiomIndex: 0,
  }
}

function makeSession(): QuizSession {
  return {
    settings: {
      bookId: 'idiom-target-1000',
      startNumber: 12,
      endNumber: 34,
      mode: 'sentence',
      target: 'all',
      order: 'sequential',
    },
    items: [makeItem('0012'), makeItem('0013'), makeItem('0014'), makeItem('0015')],
    currentIndex: 0,
    results: {},
  }
}

describe('GameView', () => {
  beforeEach(() => {
    localStorage.clear()
    mockPush.mockReset()
    mockReplace.mockReset()
  })

  it('ゲーム終了時にモード・単語／熟語・開始／終了の情報を表示する', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeSession()))
    localStorage.setItem(STORAGE_KEY_GAME_SETTINGS, JSON.stringify({ difficulty: 'hard' }))

    let rafCallback: FrameRequestCallback | null = null
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        rafCallback = cb
        return 1
      })
    const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    const wrapper = mount(GameView, { global: { plugins: [vuetify] } })
    await flushPromises()

    for (let i = 1; i <= 500; i += 1) {
      if (!rafCallback) break
      rafCallback(i * 16)
      await flushPromises()
      if (wrapper.text().includes('ゲームオーバー')) break
    }

    expect(wrapper.text()).toContain('ゲームオーバー')
    expect(wrapper.text()).toContain('モード')
    expect(wrapper.text()).toContain('例文（英語 → 日本語）')
    expect(wrapper.text()).toContain('単語／熟語')
    expect(wrapper.text()).toContain('熟語')
    expect(wrapper.text()).toContain('開始／終了')
    expect(wrapper.text()).toContain('12 〜 34')

    requestAnimationFrameSpy.mockRestore()
    cancelAnimationFrameSpy.mockRestore()
  })
})
