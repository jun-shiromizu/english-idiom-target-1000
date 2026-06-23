import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import DictationView from '../DictationView.vue'
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
    },
  ],
  notes: [],
}

function makeItem(number: string, questionText: string): QuizItem {
  return {
    number,
    idiomData: mockIdiomData,
    mode: 'idiom',
    direction: 'ja-to-en',
    questionText,
    idiomIndex: 0,
  }
}

function makeDictationSession(overrides: Partial<QuizSession> = {}): QuizSession {
  return {
    settings: {
      bookId: 'word-target-1900',
      startNumber: 1,
      endNumber: 2,
      mode: 'idiom',
      direction: 'ja-to-en',
      target: 'all',
      order: 'sequential',
    },
    items: [
      makeItem('0001', 'を創り出す'),
      makeItem('0002', '一方で'),
    ],
    currentIndex: 0,
    results: {},
    sessionType: 'dictation',
    ...overrides,
  }
}

describe('DictationView', () => {
  beforeEach(() => {
    localStorage.clear()
    mockPush.mockReset()
    mockReplace.mockReset()
  })

  it('dictation sessionType なしのとき home へリダイレクトする', async () => {
    const session = makeDictationSession()
    delete session.sessionType
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session))
    mount(DictationView, { global: { plugins: [vuetify] } })
    await flushPromises()
    expect(mockReplace).toHaveBeenCalledWith({ name: 'home' })
  })

  it('sessionType が quiz のとき home へリダイレクトする', async () => {
    const session = { ...makeDictationSession(), sessionType: 'quiz' as const }
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session))
    mount(DictationView, { global: { plugins: [vuetify] } })
    await flushPromises()
    expect(mockReplace).toHaveBeenCalledWith({ name: 'home' })
  })

  it('items が空のとき home へリダイレクトする', async () => {
    const session = makeDictationSession({ items: [] })
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session))
    mount(DictationView, { global: { plugins: [vuetify] } })
    await flushPromises()
    expect(mockReplace).toHaveBeenCalledWith({ name: 'home' })
  })

  it('currentIndex が範囲外のとき home へリダイレクトする', async () => {
    const session = makeDictationSession({ currentIndex: 2 })
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session))
    mount(DictationView, { global: { plugins: [vuetify] } })
    await flushPromises()
    expect(mockReplace).toHaveBeenCalledWith({ name: 'home' })
  })

  it('idiomIndex が範囲外の item を含むとき home へリダイレクトする', async () => {
    const session = makeDictationSession({
      items: [
        {
          ...makeItem('0001', 'を創り出す'),
          idiomIndex: 1,
        },
      ],
    })
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session))
    mount(DictationView, { global: { plugins: [vuetify] } })
    await flushPromises()
    expect(mockReplace).toHaveBeenCalledWith({ name: 'home' })
  })

  it('問題文と入力欄が表示される', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeDictationSession()))
    const wrapper = mount(DictationView, { global: { plugins: [vuetify] }, attachTo: document.body })
    await flushPromises()
    expect(wrapper.text()).toContain('を創り出す')
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('正しい入力で正誤判定結果が表示される', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeDictationSession()))
    const wrapper = mount(DictationView, { global: { plugins: [vuetify] }, attachTo: document.body })
    await flushPromises()

    const input = wrapper.find('input')
    await input.setValue('create')
    await input.trigger('keydown.enter')
    await flushPromises()

    expect(wrapper.text()).toContain('正解')
  })

  it('誤った入力で正誤判定結果が表示される', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeDictationSession()))
    const wrapper = mount(DictationView, { global: { plugins: [vuetify] }, attachTo: document.body })
    await flushPromises()

    const input = wrapper.find('input')
    await input.setValue('creat')
    await input.trigger('keydown.enter')
    await flushPromises()

    expect(wrapper.text()).toContain('不正解')
    expect(wrapper.text()).toContain('creat')
  })

  it('最後の問題で「結果を見る」を押すと result 画面に遷移する', async () => {
    const session = makeDictationSession({ currentIndex: 1 })
    session.items = [session.items[1]]
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({ ...session, currentIndex: 0 }))

    const wrapper = mount(DictationView, { global: { plugins: [vuetify] }, attachTo: document.body })
    await flushPromises()

    const input = wrapper.find('input')
    await input.setValue('create')
    await input.trigger('keydown.enter')
    await flushPromises()

    const nextBtn = wrapper.findAll('button').find((b) => b.text().includes('結果を見る'))
    await nextBtn!.trigger('click')
    await flushPromises()

    expect(mockPush).toHaveBeenCalledWith({ name: 'result' })
  })

  it('2問ある場合「次の問題へ」を押すと次の問題に進む', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeDictationSession()))
    const wrapper = mount(DictationView, { global: { plugins: [vuetify] }, attachTo: document.body })
    await flushPromises()

    const input = wrapper.find('input')
    await input.setValue('create')
    await input.trigger('keydown.enter')
    await flushPromises()

    const nextBtn = wrapper.findAll('button').find((b) => b.text().includes('次の問題へ'))
    await nextBtn!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('一方で')
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('中断ボタンをクリックすると確認ダイアログが開く', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeDictationSession()))
    const wrapper = mount(DictationView, {
      global: {
        plugins: [vuetify],
        stubs: { VDialog: { template: '<div><slot name=\"default\" /></div>' } },
      },
    })
    await flushPromises()

    const quitBtn = wrapper.findAll('button').find((b) => b.text().includes('中断'))
    await quitBtn!.trigger('click')
    await flushPromises()

    const confirmBtn = wrapper.findAll('button').find((b) => b.text() === 'トップへ')
    await confirmBtn!.trigger('click')
    await flushPromises()

    expect(mockPush).toHaveBeenCalledWith({ name: 'home' })
  })
})
