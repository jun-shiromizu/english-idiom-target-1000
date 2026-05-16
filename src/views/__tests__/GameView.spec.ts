import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import GameView from '../GameView.vue'
import type { IdiomData, QuizItem, QuizSession } from '@/types'
import { STORAGE_KEY_SESSION } from '@/config'

const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}))

const vuetify = createVuetify()

function makeItem(number: string, questionText: string, meaning: string): QuizItem {
  const idiomData: IdiomData = {
    idioms: [questionText],
    means: [{ 'idiom-jp': meaning, 'example-sentence': `${questionText} example`, 'sentence-jp': `${meaning}の例文` }],
    notes: [],
  }

  return {
    number,
    idiomData,
    questionText,
    idiomIndex: 0,
  }
}

function makeSession(): QuizSession {
  return {
    settings: {
      bookId: 'idiom-target-1000',
      startNumber: 1,
      endNumber: 4,
      mode: 'idiom',
      target: 'all',
      order: 'sequential',
    },
    items: [
      makeItem('0001', 'a piece of ~', '一つの〜'),
      makeItem('0002', 'at all costs', 'どんな犠牲を払っても'),
      makeItem('0003', 'come up with', '思いつく'),
      makeItem('0004', 'in the long run', '結局は'),
    ],
    currentIndex: 0,
    results: {},
  }
}

describe('GameView', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeSession()))
    mockPush.mockReset()
    mockReplace.mockReset()
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  it('一時停止中は問題文と選択肢を非表示にできる', async () => {
    const wrapper = mount(GameView, { global: { plugins: [vuetify] } })
    await flushPromises()

    expect(wrapper.text()).toContain('a piece of ~')
    const pauseButton = wrapper.findAll('button').find((button) => button.text().includes('一時停止'))
    expect(pauseButton, '一時停止ボタンが見つかりません').toBeTruthy()
    await pauseButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('一時停止中')
    expect(wrapper.text()).not.toContain('a piece of ~')
    expect(wrapper.findAll('.choice-button')).toHaveLength(0)
  })

  it('一時停止後に再開すると問題表示へ戻る', async () => {
    const wrapper = mount(GameView, { global: { plugins: [vuetify] } })
    await flushPromises()

    const pauseButton = wrapper.findAll('button').find((button) => button.text().includes('一時停止'))
    expect(pauseButton, '一時停止ボタンが見つかりません').toBeTruthy()
    await pauseButton!.trigger('click')
    await flushPromises()
    const resumeButton = wrapper.findAll('button').find((button) => button.text().includes('再開'))
    expect(resumeButton, '再開ボタンが見つかりません').toBeTruthy()
    await resumeButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('一時停止中')
    expect(wrapper.text()).toContain('a piece of ~')
    expect(wrapper.findAll('.choice-button').length).toBeGreaterThan(0)
  })
})
