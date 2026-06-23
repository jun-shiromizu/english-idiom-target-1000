import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import ClozeView from '../ClozeView.vue'
import type { IdiomData, QuizItem, QuizSession } from '@/types'
import { STORAGE_KEY_SESSION } from '@/config'

const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}))

const vuetify = createVuetify()

const mockIdiomData: IdiomData = {
  idioms: ['create'],
  means: [
    {
      'idiom-jp': 'を創り出す',
      'example-sentence': 'Technological change will create new ways of living.',
      'sentence-jp': '技術の変化は新たな生活様式を創り出す。',
      cloze: {
        maskedText: 'Technological change will ____ new ways of living.',
        answerBase: 'create',
        answerSurface: 'create',
        choices: ['create', 'build', 'change', 'shape'],
      },
    },
  ],
  notes: [],
}

function makeItem(number: string, questionText: string, answerSurface = 'create'): QuizItem {
  return {
    number,
    idiomData: mockIdiomData,
    mode: 'sentence',
    direction: 'en-to-ja',
    questionText,
    idiomIndex: 0,
    meanIndex: 0,
    cloze: {
      maskedText: questionText,
      answerBase: 'create',
      answerSurface,
      choices: [answerSurface, 'build', 'change', 'shape'],
    },
  }
}

function makeClozeSession(overrides: Partial<QuizSession> = {}): QuizSession {
  return {
    settings: {
      bookId: 'word-target-1900',
      startNumber: 1,
      endNumber: 2,
      mode: 'sentence',
      direction: 'en-to-ja',
      target: 'all',
      order: 'sequential',
    },
    items: [
      makeItem('0001', 'Technological change will ____ new ways of living.'),
      makeItem('0002', 'On the other hand, she can ____ quickly.', 'adapt'),
    ],
    currentIndex: 0,
    results: {},
    sessionType: 'cloze',
    ...overrides,
  }
}

describe('ClozeView', () => {
  beforeEach(() => {
    localStorage.clear()
    mockPush.mockReset()
    mockReplace.mockReset()
  })

  it('cloze sessionType なしのとき home へリダイレクトする', async () => {
    const session = makeClozeSession()
    delete session.sessionType
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session))
    mount(ClozeView, { global: { plugins: [vuetify] } })
    await flushPromises()
    expect(mockReplace).toHaveBeenCalledWith({ name: 'home' })
  })

  it('currentIndex が範囲外のとき home へリダイレクトする', async () => {
    const session = makeClozeSession({ currentIndex: 2 })
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session))
    mount(ClozeView, { global: { plugins: [vuetify] } })
    await flushPromises()
    expect(mockReplace).toHaveBeenCalledWith({ name: 'home' })
  })

  it('cloze を持たない item を含むとき home へリダイレクトする', async () => {
    const session = makeClozeSession({
      items: [
        {
          ...makeItem('0001', 'Technological change will ____ new ways of living.'),
          cloze: undefined,
        },
      ],
    })
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session))
    mount(ClozeView, { global: { plugins: [vuetify] } })
    await flushPromises()
    expect(mockReplace).toHaveBeenCalledWith({ name: 'home' })
  })

  it('問題文と4択が表示される', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeClozeSession()))
    const wrapper = mount(ClozeView, { global: { plugins: [vuetify] } })
    await flushPromises()
    expect(wrapper.text()).toContain('技術の変化は新たな生活様式を創り出す。')
    expect(wrapper.text()).toContain('Technological change will ____ new ways of living.')
    expect(wrapper.findAll('button').some((button) => button.text().includes('create'))).toBe(true)
  })

  it('正しい選択肢を押すと正解が表示される', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeClozeSession()))
    const wrapper = mount(ClozeView, { global: { plugins: [vuetify] }, attachTo: document.body })
    await flushPromises()

    const choice = wrapper.findAll('button').find((button) => button.text().includes('create'))
    await choice!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('正解')
  })

  it('誤った選択肢を押すと不正解が表示される', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeClozeSession()))
    const wrapper = mount(ClozeView, { global: { plugins: [vuetify] }, attachTo: document.body })
    await flushPromises()

    const choice = wrapper.findAll('button').find((button) => button.text().includes('build'))
    await choice!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('不正解')
    expect(wrapper.text()).toContain('build')
  })
})
