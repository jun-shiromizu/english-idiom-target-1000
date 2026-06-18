import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import TypingRaceView from '../TypingRaceView.vue'
import type { IdiomData, QuizItem, QuizSession } from '@/types'
import { STORAGE_KEY_SESSION } from '@/config'

const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockResume = vi.fn().mockResolvedValue(undefined)
const mockClose = vi.fn().mockResolvedValue(undefined)
const mockCreateOscillator = vi.fn(() => ({
  type: 'square',
  frequency: {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}))
const mockCreateGain = vi.fn(() => ({
  connect: vi.fn(),
  gain: {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
}))

class MockAudioContext {
  state: AudioContextState = 'running'
  currentTime = 0
  destination = {}

  resume = mockResume
  close = mockClose
  createOscillator = mockCreateOscillator
  createGain = mockCreateGain
}

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}))

const vuetify = createVuetify()

const mockIdiomData: IdiomData = {
  idioms: ['look forward to'],
  means: [
    {
      'idiom-jp': 'を楽しみに待つ',
      'example-sentence': 'I am looking forward to hearing from you.',
      'sentence-jp': 'あなたからの連絡を楽しみにしています。',
    },
  ],
  notes: [],
}

function makeItem(number: string, sentence: string): QuizItem {
  return {
    number,
    idiomData: {
      ...mockIdiomData,
      means: [{ ...mockIdiomData.means[0], 'example-sentence': sentence }],
    },
    mode: 'sentence',
    direction: 'en-to-ja',
    questionText: sentence,
    idiomIndex: 0,
    meanIndex: 0,
  }
}

function makeSession(overrides: Partial<QuizSession> = {}): QuizSession {
  return {
    settings: {
      bookId: 'idiom-target-1000',
      startNumber: 1,
      endNumber: 2,
      mode: 'sentence',
      direction: 'en-to-ja',
      target: 'all',
      order: 'sequential',
    },
    items: [
      makeItem('0001', 'I am looking forward to hearing from you.'),
      makeItem('0002', 'She keeps in touch with her mentor every week.'),
    ],
    currentIndex: 0,
    results: {},
    sessionType: 'typing-race',
    timeLimitSeconds: 60,
    endsAt: Date.now() + 60_000,
    ...overrides,
  }
}

describe('TypingRaceView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-18T12:00:00Z'))
    localStorage.clear()
    mockPush.mockReset()
    mockReplace.mockReset()
    mockResume.mockClear()
    mockClose.mockClear()
    mockCreateOscillator.mockClear()
    mockCreateGain.mockClear()
    vi.stubGlobal('AudioContext', MockAudioContext)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('typing-race session 以外は home へリダイレクトする', async () => {
    localStorage.setItem(
      STORAGE_KEY_SESSION,
      JSON.stringify({ ...makeSession(), sessionType: 'quiz' as const }),
    )

    mount(TypingRaceView, { global: { plugins: [vuetify] } })
    await flushPromises()

    expect(mockReplace).toHaveBeenCalledWith({ name: 'home' })
  })

  it('正しい例文を送信すると次の例文へ進み正解数が増える', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeSession()))

    const wrapper = mount(TypingRaceView, {
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    await flushPromises()

    expect(wrapper.text()).toContain('I am looking forward to hearing from you.')

    const input = wrapper.find('input')
    await input.setValue('I am looking forward to hearing from you.')
    await input.trigger('keydown.enter')
    await flushPromises()

    expect(wrapper.text()).toContain('She keeps in touch with her mentor every week.')
    expect(wrapper.text()).toContain('1 正解')

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_SESSION) ?? '{}') as QuizSession
    expect(saved.currentIndex).toBe(1)
    expect(saved.results).toEqual({ 0: true })
    expect(saved.typingRaceStats).toEqual({
      correctChars: 'I am looking forward to hearing from you.'.length,
      mistypedChars: 0,
    })
  })

  it('和訳を英文の上に表示する', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeSession()))

    const wrapper = mount(TypingRaceView, {
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('あなたからの連絡を楽しみにしています。')
    expect(text.indexOf('あなたからの連絡を楽しみにしています。')).toBeLessThan(
      text.indexOf('I am looking forward to hearing from you.'),
    )
  })

  it('誤った文字は入力されない', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeSession()))

    const wrapper = mount(TypingRaceView, {
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    await flushPromises()

    const input = wrapper.find('input')
    await input.setValue('I')
    expect((input.element as HTMLInputElement).value).toBe('I')

    await input.setValue('Ix')
    await flushPromises()

    expect((input.element as HTMLInputElement).value).toBe('I')

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_SESSION) ?? '{}') as QuizSession
    expect(saved.typingRaceStats).toEqual({
      correctChars: 0,
      mistypedChars: 1,
    })
  })

  it('入力済みの文字をガイド表示で薄く見せる', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeSession()))

    const wrapper = mount(TypingRaceView, {
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    await flushPromises()

    const input = wrapper.find('input')
    await input.setValue('I am')
    await flushPromises()

    const typed = wrapper.find('.race-progress__typed')
    expect(typed.text()).toBe('I am')
    expect(wrapper.find('.race-progress').text()).toContain('looking forward to hearing from you.')
  })

  it('正解時に演出クラスと効果音が発火する', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeSession()))

    const wrapper = mount(TypingRaceView, {
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    await flushPromises()

    const input = wrapper.find('input')
    await input.setValue('I am looking forward to hearing from you.')
    await input.trigger('keydown.enter')
    await flushPromises()

    expect(wrapper.find('.race-card').classes()).toContain('race-card--celebrate')
    expect(mockCreateOscillator).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(600)
    await flushPromises()

    expect(wrapper.find('.race-card').classes()).not.toContain('race-card--celebrate')
  })

  it('制限時間を過ぎると結果画面に切り替わる', async () => {
    localStorage.setItem(
      STORAGE_KEY_SESSION,
      JSON.stringify(makeSession({ endsAt: Date.now() + 1_000 })),
    )

    const wrapper = mount(TypingRaceView, {
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    await flushPromises()

    vi.advanceTimersByTime(1_500)
    await flushPromises()

    expect(wrapper.text()).toContain('60秒チャレンジ結果')
    expect(wrapper.text()).toContain('正解した文字数')
    expect(wrapper.text()).toContain('ミスタイプ 0 文字')
    expect(wrapper.text()).toContain('続ける')
  })

  it('タイムアップ後に「続ける」で次の60秒を開始する', async () => {
    localStorage.setItem(
      STORAGE_KEY_SESSION,
      JSON.stringify(
        makeSession({
          currentIndex: 1,
          results: { 0: true },
          typingRaceStats: { correctChars: 40, mistypedChars: 2 },
          endsAt: Date.now() + 1_000,
        }),
      ),
    )

    const wrapper = mount(TypingRaceView, {
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    await flushPromises()

    vi.advanceTimersByTime(1_500)
    await flushPromises()

    const continueButton = wrapper.findAll('button').find((button) => button.text().includes('続ける'))
    expect(continueButton).toBeTruthy()
    await continueButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('She keeps in touch with her mentor every week.')
    expect(wrapper.text()).not.toContain('60秒チャレンジ結果')

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_SESSION) ?? '{}') as QuizSession
    expect(saved.currentIndex).toBe(1)
    expect(saved.typingRaceStats).toEqual({ correctChars: 40, mistypedChars: 2 })
  })
})
