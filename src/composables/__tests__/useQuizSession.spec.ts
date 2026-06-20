import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useQuizSession } from '../useQuizSession'
import type { IdiomData, QuizSettings } from '@/types'

// useHistory の isIncorrect をモック
vi.mock('../useHistory', () => ({
  useHistory: () => ({
    isIncorrect: vi.fn().mockReturnValue(false),
    setResult: vi.fn(),
    getHistory: vi.fn().mockReturnValue({}),
    clearAll: vi.fn(),
    clearRange: vi.fn(),
  }),
}))

const mockIdiom1: IdiomData = {
  idioms: ['a piece of ~'],
  means: [
    {
      'idiom-jp': '１つの～',
      'example-sentence': 'example 1',
      'sentence-jp': '例文訳1',
      cloze: {
        maskedText: 'cloze 1 ____',
        answerBase: 'a piece of ~',
        answerSurface: 'piece of',
        choices: ['piece of', 'lot of', 'pair of', 'kind of'],
      },
    },
  ],
  notes: [],
}

const mockIdiom2: IdiomData = {
  idioms: ['a couple of ~'],
  means: [
    {
      'idiom-jp': '２つの～',
      'example-sentence': 'example 2a',
      'sentence-jp': '例文訳2a',
      cloze: {
        maskedText: 'cloze 2a ____',
        answerBase: 'a couple of ~',
        answerSurface: 'a couple of',
        choices: ['a couple of', 'a lot of', 'a pair of', 'a kind of'],
      },
    },
    { 'idiom-jp': '２、３の～', 'example-sentence': 'example 2b', 'sentence-jp': '例文訳2b' },
  ],
  notes: [],
}

const mockIdiomMultiple: IdiomData = {
  idioms: ['a great deal of ~', 'a good deal of ~'],
  means: [{ 'idiom-jp': 'たくさん', 'example-sentence': 'example 6', 'sentence-jp': '例文訳6' }],
  notes: [],
}

const dataMap = new Map<string, IdiomData>([
  ['0001', mockIdiom1],
  ['0002', mockIdiom2],
  ['0006', mockIdiomMultiple],
])

const baseSettings: QuizSettings = {
  bookId: 'idiom-target-1000',
  startNumber: 1,
  endNumber: 6,
  mode: 'idiom',
  direction: 'en-to-ja',
  target: 'all',
  order: 'sequential',
}

describe('useQuizSession', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('buildItems - idiom モード', () => {
    it('単一熟語は "(n)" なしで出題テキストを生成する', () => {
      const { buildItems } = useQuizSession()
      const items = buildItems(baseSettings, dataMap)
      const item0001 = items.find((i) => i.number === '0001')
      expect(item0001?.questionText).toBe('a piece of ~')
    })

    it('複数意味の場合は意味数を付与する', () => {
      const { buildItems } = useQuizSession()
      const items = buildItems(baseSettings, dataMap)
      const item0002 = items.find((i) => i.number === '0002')
      expect(item0002?.questionText).toBe('a couple of ~ (2)')
    })

    it('熟語が複数ある場合はそれぞれ別の QuizItem として展開する', () => {
      const { buildItems } = useQuizSession()
      const items = buildItems(baseSettings, dataMap)
      const items0006 = items.filter((i) => i.number === '0006')
      expect(items0006).toHaveLength(2)
      // means が1つなので "(1)" は付かない（spec.md の例は便宜上の表記）
      expect(items0006[0].questionText).toBe('a great deal of ~')
      expect(items0006[1].questionText).toBe('a good deal of ~')
    })
  })

  describe('buildItems - sentence モード', () => {
    it('複数意味の場合は means ごとに別々に出題する', () => {
      const sentenceSettings: QuizSettings = { ...baseSettings, mode: 'sentence' }
      const { buildItems } = useQuizSession()
      const items = buildItems(sentenceSettings, dataMap)
      const items0002 = items.filter((i) => i.number === '0002')
      expect(items0002).toHaveLength(2)
      expect(items0002[0].questionText).toBe('example 2a')
      expect(items0002[1].questionText).toBe('example 2b')
    })

    it('日本語→英語では例文訳を問題文にする', () => {
      const sentenceSettings: QuizSettings = {
        ...baseSettings,
        mode: 'sentence',
        direction: 'ja-to-en',
      }
      const { buildItems } = useQuizSession()
      const items = buildItems(sentenceSettings, dataMap)
      const item0002 = items.find((i) => i.number === '0002' && i.meanIndex === 0)
      expect(item0002?.questionText).toBe('例文訳2a')
    })
  })

  describe('buildDictationItems', () => {
    it('cloze を持つ means ごとに穴埋め問題を作成する', () => {
      const sentenceSettings: QuizSettings = { ...baseSettings, mode: 'sentence' }
      const { buildDictationItems } = useQuizSession()
      const items = buildDictationItems(sentenceSettings, dataMap)

      expect(items).toHaveLength(2)
      expect(items[0].questionText).toBe('cloze 1 ____')
      expect(items[0].cloze?.answerSurface).toBe('piece of')
      expect(items[1].questionText).toBe('cloze 2a ____')
      expect(items[1].cloze?.choices).toEqual([
        'a couple of',
        'a lot of',
        'a pair of',
        'a kind of',
      ])
    })

    it('sentence 以外のモードでは穴埋め問題を作成しない', () => {
      const { buildDictationItems } = useQuizSession()
      expect(buildDictationItems(baseSettings, dataMap)).toEqual([])
    })
  })

  describe('buildItems - 日本語→英語', () => {
    it('単語／熟語モードでは意味ごとに別問題を作成する', () => {
      const settings: QuizSettings = {
        ...baseSettings,
        mode: 'idiom',
        direction: 'ja-to-en',
      }
      const { buildItems } = useQuizSession()
      const items = buildItems(settings, dataMap)
      const items0002 = items.filter((i) => i.number === '0002')

      expect(items0002).toHaveLength(2)
      expect(items0002[0].questionText).toBe('２つの～')
      expect(items0002[1].questionText).toBe('２、３の～')
    })
  })

  describe('セッション保存・復元', () => {
    it('セッションをlocalStorageに保存し復元できる', () => {
      const { buildItems, saveSession, loadSession } = useQuizSession()
      const items = buildItems(baseSettings, dataMap)
      const session = { settings: baseSettings, items, currentIndex: 2, results: { 0: true, 1: false } }

      saveSession(session)
      const loaded = loadSession()

      expect(loaded?.currentIndex).toBe(2)
      expect(loaded?.results[0]).toBe(true)
      expect(loaded?.settings.bookId).toBe('idiom-target-1000')
    })

    it('clearSession でlocalStorageから削除される', () => {
      const { saveSession, clearSession, loadSession } = useQuizSession()
      const session = { settings: baseSettings, items: [], currentIndex: 0, results: {} }
      saveSession(session)
      clearSession()
      expect(loadSession()).toBeNull()
    })

    it('旧セッション形式を読み込むと既定教材が補完される', () => {
      localStorage.setItem(
        'idiom-app-session',
        JSON.stringify({
          settings: {
            startNumber: 1,
            endNumber: 3,
            mode: 'idiom',
            target: 'all',
            order: 'sequential',
          },
          items: [],
          currentIndex: 0,
          results: {},
        }),
      )

      const { loadSession } = useQuizSession()
      expect(loadSession()?.settings.bookId).toBe('idiom-target-1000')
      expect(loadSession()?.settings.direction).toBe('en-to-ja')
    })
  })
})
