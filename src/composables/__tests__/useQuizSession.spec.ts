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
  means: [{ 'idiom-jp': '１つの～', 'example-sentence': 'example 1', 'sentence-jp': '例文訳1' }],
  notes: [],
}

const mockIdiom2: IdiomData = {
  idioms: ['a couple of ~'],
  means: [
    { 'idiom-jp': '２つの～', 'example-sentence': 'example 2a', 'sentence-jp': '例文訳2a' },
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

const emptySupplMap = new Map<string, string[]>()

const baseSettings: QuizSettings = {
  startNumber: 1,
  endNumber: 6,
  mode: 'idiom',
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
      const items = buildItems(baseSettings, dataMap, emptySupplMap)
      const item0001 = items.find((i) => i.number === '0001')
      expect(item0001?.questionText).toBe('a piece of ~')
    })

    it('複数意味の場合は意味数を付与する', () => {
      const { buildItems } = useQuizSession()
      const items = buildItems(baseSettings, dataMap, emptySupplMap)
      const item0002 = items.find((i) => i.number === '0002')
      expect(item0002?.questionText).toBe('a couple of ~ (2)')
    })

    it('熟語が複数ある場合はそれぞれ別の QuizItem として展開する', () => {
      const { buildItems } = useQuizSession()
      const items = buildItems(baseSettings, dataMap, emptySupplMap)
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
      const items = buildItems(sentenceSettings, dataMap, emptySupplMap)
      const items0002 = items.filter((i) => i.number === '0002')
      expect(items0002).toHaveLength(2)
      expect(items0002[0].questionText).toBe('example 2a')
      expect(items0002[1].questionText).toBe('example 2b')
    })
  })

  describe('セッション保存・復元', () => {
    it('セッションをlocalStorageに保存し復元できる', () => {
      const { buildItems, saveSession, loadSession } = useQuizSession()
      const items = buildItems(baseSettings, dataMap, emptySupplMap)
      const session = { settings: baseSettings, items, currentIndex: 2, results: { 0: true, 1: false } }

      saveSession(session)
      const loaded = loadSession()

      expect(loaded?.currentIndex).toBe(2)
      expect(loaded?.results[0]).toBe(true)
    })

    it('clearSession でlocalStorageから削除される', () => {
      const { saveSession, clearSession, loadSession } = useQuizSession()
      const items = buildItems(baseSettings, dataMap, emptySupplMap)
      function buildItems(s: QuizSettings, d: Map<string, IdiomData>, m: Map<string, string[]>) {
        const { buildItems: b } = useQuizSession()
        return b(s, d, m)
      }
      const session = { settings: baseSettings, items: [], currentIndex: 0, results: {} }
      saveSession(session)
      clearSession()
      expect(loadSession()).toBeNull()
    })
  })
})
