import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import ResultView from '../ResultView.vue'
import type { ClassicQuizSession, QuizSession, QuizItem, IdiomData } from '@/types'
import { STORAGE_KEY_SESSION } from '@/config'
import { getClassicWordHistoryKey, useHistory } from '@/composables/useHistory'
import { makeClassicSession, makeClassicSettings, makeClassicWord } from '@/__tests__/fixtures/classicWords'
import { useAppNotice } from '@/composables/useAppNotice'
import { INVALID_CLASSIC_SESSION_REDIRECT_NOTICE } from '@/utils/routeGuards'

// vue-router をモック
const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
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
    mode: 'idiom',
    direction: 'en-to-ja',
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
      direction: 'en-to-ja',
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

describe('ResultView の古文単語330', () => {
  const words = ['0001', '0002', '0003'].map((number) => makeClassicWord(number))

  function makeClassicResultSession() {
    return makeClassicSession({
      settings: makeClassicSettings({ startNumber: 1, endNumber: 3 }),
      words: Object.fromEntries(words.map((word) => [word.number, word])),
      items: words.map((word) => ({
        number: word.number,
        mode: 'idiom' as const,
        direction: 'classic-to-modern' as const,
        questionText: word.words[0],
        historyKey: getClassicWordHistoryKey(word, 0),
        wordIndex: 0,
      })),
      currentIndex: 2,
      results: { 0: true, 1: false, 2: false },
    })
  }

  async function mountClassicResult() {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeClassicResultSession()))
    const wrapper = mount(ResultView, {
      global: {
        plugins: [vuetify],
        stubs: { VDialog: { template: '<div><slot name="default" /></div>' } },
      },
    })
    await flushPromises()
    return wrapper
  }

  beforeEach(() => {
    localStorage.clear()
    mockPush.mockReset()
    vi.restoreAllMocks()
  })

  it('CJ-15: 生成問題数を分母として結果を表示する', async () => {
    const wrapper = await mountClassicResult()

    expect(wrapper.text()).toContain('/ 3 問')
    expect(wrapper.text()).toContain('正解率: 33%')
    wrapper.unmount()
  })

  it('CJ-15: 不正解のみ再挑戦は不正解の問題と参照する単語データだけを保存する', async () => {
    const wrapper = await mountClassicResult()

    await wrapper.findAll('button').find((b) => b.text().includes('間違えたところをやり直す'))!.trigger('click')

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_SESSION)!) as ClassicQuizSession
    expect(saved.contentType).toBe('classic-japanese')
    expect(saved.items.map((item) => item.number)).toEqual(['0002', '0003'])
    expect(Object.keys(saved.words).sort()).toEqual(['0002', '0003'])
    expect(saved.settings.target).toBe('incorrect')
    expect(saved).toMatchObject({ currentIndex: 0, results: {} })
    expect(mockPush).toHaveBeenCalledWith({ name: 'quiz' })
    wrapper.unmount()
  })

  it('CJ-12/CJ-15: 範囲履歴クリア後の再挑戦は古文の範囲履歴だけを削除する', async () => {
    const { setClassicResult, setResult, getHistory } = useHistory()
    setClassicResult(getClassicWordHistoryKey(words[1], 0), false)
    setResult('idiom-target-1000', '0002', 0, 1, false)
    const wrapper = await mountClassicResult()

    await wrapper.findAll('button').find((b) => b.text().includes('クリアして再挑戦'))!.trigger('click')
    await flushPromises()

    expect(getHistory()).toEqual({ 'idiom-target-1000:idiom:en-to-ja:0002': false })
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_SESSION)!) as ClassicQuizSession
    expect(saved.items).toHaveLength(3)
    expect(saved).toMatchObject({ currentIndex: 0, results: {} })
    expect(mockPush).toHaveBeenCalledWith({ name: 'quiz' })
    wrapper.unmount()
  })

  it('再挑戦データを保存できない場合はエラーを表示して遷移しない', async () => {
    const wrapper = await mountClassicResult()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })

    await wrapper.findAll('button').find((b) => b.text().includes('間違えたところをやり直す'))!.trigger('click')

    expect(wrapper.text()).toContain('再挑戦用のデータを保存できませんでした。')
    expect(mockPush).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('復元できない古文セッションは保存データを残したままトップへ戻り、理由を重複させずに通知する', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({ ...makeClassicResultSession(), words: {} }))
    const storedBefore = localStorage.getItem(STORAGE_KEY_SESSION)
    mockReplace.mockReset()
    useAppNotice().consumeNotice()

    const wrapper = mount(ResultView, { global: { plugins: [vuetify] } })
    await flushPromises()

    expect(mockReplace).toHaveBeenCalledWith({ name: 'home' })
    expect(useAppNotice().consumeNotice()).toBe(INVALID_CLASSIC_SESSION_REDIRECT_NOTICE)
    expect(localStorage.getItem(STORAGE_KEY_SESSION)).toBe(storedBefore)
    wrapper.unmount()
  })
})
