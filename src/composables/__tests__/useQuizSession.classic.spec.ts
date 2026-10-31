import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY_SESSION } from '@/config'
import { SessionSaveError, useQuizSession } from '../useQuizSession'
import { getClassicExampleHistoryKey, getClassicWordHistoryKey, useHistory } from '../useHistory'
import { makeClassicSession, makeClassicSettings, makeClassicWord } from '@/__tests__/fixtures/classicWords'
import type { ClassicWordData } from '@/types'

const twoWordsTwoMeans = makeClassicWord('0001', {
  words: ['見出しA', '見出しB'],
  means: [
    { senseNumber: 1, meaning: '意味1', examples: [{ text: '例文1a', translation: '訳1a' }, { text: '例文1b', translation: '訳1b' }] },
    { senseNumber: 2, meaning: '意味2', examples: [{ text: '例文2a', translation: '訳2a' }] },
  ],
})
const noExamples = makeClassicWord('0002', {
  means: [{ senseNumber: 1, meaning: '意味', examples: [] }],
})
const simple = makeClassicWord('0003')

const dataMap = new Map<string, ClassicWordData>([
  ['0001', twoWordsTwoMeans],
  ['0002', noExamples],
  ['0003', simple],
])

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('buildClassicItems', () => {
  it('CJ-07: 見出し語形式は表記ごとに1問を作り、意味の数では増やさない', () => {
    const { buildClassicItems } = useQuizSession()

    const items = buildClassicItems(makeClassicSettings({ startNumber: 1, endNumber: 1 }), dataMap)

    expect(items).toEqual([
      expect.objectContaining({ number: '0001', mode: 'idiom', questionText: '見出しA', wordIndex: 0 }),
      expect.objectContaining({ number: '0001', mode: 'idiom', questionText: '見出しB', wordIndex: 1 }),
    ])
    expect(items[0].historyKey).toBe(getClassicWordHistoryKey(twoWordsTwoMeans, 0))
  })

  it('CJ-08/CJ-09: 例文形式は意味×例文ごとに1問を作り、例文がない番号は除外する', () => {
    const { buildClassicItems } = useQuizSession()

    const items = buildClassicItems(makeClassicSettings({ mode: 'sentence', startNumber: 1, endNumber: 2 }), dataMap)

    expect(items.map((item) => item.questionText)).toEqual(['例文1a', '例文1b', '例文2a'])
    expect(items[2]).toMatchObject({ number: '0001', mode: 'sentence', meanIndex: 1, exampleIndex: 0 })
    expect(items.some((item) => item.number === '0002')).toBe(false)
  })

  it('出題範囲外のデータは使わない', () => {
    const { buildClassicItems } = useQuizSession()

    const items = buildClassicItems(makeClassicSettings({ startNumber: 3, endNumber: 3 }), dataMap)

    expect(items.map((item) => item.number)).toEqual(['0003'])
  })

  it('CJ-11: 間違えたものだけは最新回答が不正解の問題だけに絞り込む', () => {
    const { setClassicResult } = useHistory()
    setClassicResult(getClassicWordHistoryKey(twoWordsTwoMeans, 1), false)
    setClassicResult(getClassicWordHistoryKey(simple, 0), true)
    const { buildClassicItems } = useQuizSession()

    const items = buildClassicItems(makeClassicSettings({ target: 'incorrect', startNumber: 1, endNumber: 3 }), dataMap)

    expect(items.map((item) => item.questionText)).toEqual(['見出しB'])
  })

  it('例文の不正解履歴は見出し語の出題に影響しない', () => {
    useHistory().setClassicResult(getClassicExampleHistoryKey(twoWordsTwoMeans, 0, 0), false)
    const { buildClassicItems } = useQuizSession()

    expect(
      buildClassicItems(makeClassicSettings({ target: 'incorrect', startNumber: 1, endNumber: 3 }), dataMap),
    ).toEqual([])
  })

  it('CJ-13: ランダム順では生成後に重複なく件数を制限する', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { buildClassicItems } = useQuizSession()

    const items = buildClassicItems(
      makeClassicSettings({ mode: 'sentence', order: 'random', randomQuestionCount: 2, startNumber: 1, endNumber: 3 }),
      dataMap,
    )

    expect(items).toHaveLength(2)
    expect(new Set(items.map((item) => item.historyKey)).size).toBe(2)
  })
})

describe('createClassicSession', () => {
  it('問題が参照する番号の単語データだけを1回ずつ保持する', () => {
    const { buildClassicItems, createClassicSession } = useQuizSession()
    const settings = makeClassicSettings({ startNumber: 1, endNumber: 1 })
    const items = buildClassicItems(settings, dataMap)

    const session = createClassicSession(settings, items, dataMap)

    expect(session).toMatchObject({ contentType: 'classic-japanese', sessionType: 'quiz', currentIndex: 0, results: {} })
    expect(Object.keys(session.words)).toEqual(['0001'])
    expect(session.items).toHaveLength(2)
  })
})

describe('古文セッションの保存と復元', () => {
  it('CJ-14: 保存した古文セッションを古文として復元し、英語専用の loadSession では返さない', () => {
    const { saveSession, loadStoredSession, loadSession } = useQuizSession()
    const session = makeClassicSession({ currentIndex: 0, results: { 0: false } })

    saveSession(session)

    expect(loadStoredSession()).toMatchObject({ kind: 'classic', session })
    const restored = loadStoredSession()
    expect(restored.kind === 'classic' && restored.session.analyticsSessionId).toBeTruthy()
    expect(loadSession()).toBeNull()
  })

  it('復元できない古文セッションは理由を返し、保存データを削除しない', () => {
    const raw = JSON.stringify({ ...makeClassicSession(), currentIndex: 9 })
    localStorage.setItem(STORAGE_KEY_SESSION, raw)
    const { loadStoredSession, loadSession } = useQuizSession()

    expect(loadStoredSession()).toEqual({ kind: 'invalid-classic', reason: '進捗が不正です' })
    expect(loadSession()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY_SESSION)).toBe(raw)
  })

  it('教材IDだけ古文の不完全なセッションも古文として扱い、英語セッションへ流さない', () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({ settings: { bookId: 'classic-japanese-330' } }))

    expect(useQuizSession().loadStoredSession().kind).toBe('invalid-classic')
  })

  it('旧形式の英語セッションは英語として復元する', () => {
    localStorage.setItem(
      STORAGE_KEY_SESSION,
      JSON.stringify({
        settings: { startNumber: 1, endNumber: 1, mode: 'idiom', target: 'all', order: 'sequential' },
        items: [],
        currentIndex: 0,
        results: {},
      }),
    )

    const state = useQuizSession().loadStoredSession()

    expect(state.kind).toBe('english')
    if (state.kind === 'english') {
      expect(state.session.settings).toMatchObject({ bookId: 'idiom-target-1000', direction: 'en-to-ja' })
    }
  })

  it('壊れたJSONは保存なしとして扱う', () => {
    localStorage.setItem(STORAGE_KEY_SESSION, '{broken')

    expect(useQuizSession().loadStoredSession()).toEqual({ kind: 'none' })
  })

  it('保存容量不足は SessionSaveError として通知する', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })

    expect(() => useQuizSession().saveSession(makeClassicSession())).toThrow(SessionSaveError)
  })
})
