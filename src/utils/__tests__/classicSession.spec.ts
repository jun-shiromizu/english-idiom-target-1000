import { describe, expect, it } from 'vitest'
import { isClassicQuizSession, isClassicSessionLike, parseClassicQuizSession } from '../classicSession'
import { makeClassicSession, makeClassicSettings, makeClassicWord } from '@/__tests__/fixtures/classicWords'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function expectReason(value: unknown, reason: string) {
  const result = parseClassicQuizSession(value)
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.reason).toContain(reason)
}

describe('isClassicSessionLike', () => {
  it('contentType または古文の教材IDを持つデータを古文セッション候補とする', () => {
    expect(isClassicSessionLike({ contentType: 'classic-japanese' })).toBe(true)
    expect(isClassicSessionLike({ settings: { bookId: 'classic-japanese-330' } })).toBe(true)
    expect(isClassicSessionLike({ settings: { bookId: 'word-target-1900' } })).toBe(false)
    expect(isClassicSessionLike(null)).toBe(false)
  })
})

describe('isClassicQuizSession', () => {
  it('古文セッションだけを判定する', () => {
    expect(isClassicQuizSession(makeClassicSession())).toBe(true)
  })
})

describe('parseClassicQuizSession', () => {
  it('正しい見出し語セッションを復元する', () => {
    const session = makeClassicSession({ results: { 0: true } })

    const result = parseClassicQuizSession(clone(session))

    expect(result).toEqual({ ok: true, session })
  })

  it('正しい例文セッションを復元する', () => {
    const word = makeClassicWord('0002')
    const session = makeClassicSession({
      settings: makeClassicSettings({ mode: 'sentence' }),
      words: { '0002': word },
      items: [
        {
          number: '0002',
          mode: 'sentence',
          direction: 'classic-to-modern',
          questionText: word.means[0].examples[0].text,
          historyKey: 'key',
          meanIndex: 0,
          exampleIndex: 0,
        },
      ],
    })

    expect(parseClassicQuizSession(clone(session))).toEqual({ ok: true, session })
  })

  it('単語帳以外の古文セッションは理由付きで拒否する', () => {
    expectReason({ ...makeClassicSession(), sessionType: 'dictation' }, '単語帳以外の学習モードに対応していません')
  })

  it.each([
    ['範囲外の開始番号', { startNumber: 0 }, '出題範囲が不正です'],
    ['範囲外の終了番号', { endNumber: 331 }, '出題範囲が不正です'],
    ['範囲逆転', { startNumber: 5, endNumber: 4 }, '出題範囲が不正です'],
    ['非対応の出題方向', { direction: 'en-to-ja' }, '対応していない出題方向です'],
    ['不正なランダム出題数', { randomQuestionCount: 0 }, 'ランダム出題数が不正です'],
  ])('%s の設定は拒否する', (_label, settings, reason) => {
    const session = clone(makeClassicSession()) as unknown as Record<string, unknown>
    session.settings = { ...(session.settings as object), ...settings }

    expectReason(session, reason)
  })

  it('単語データが不正なら番号を含めて拒否する', () => {
    const session = clone(makeClassicSession()) as unknown as Record<string, unknown>
    session.words = { '0001': { ...makeClassicWord('0001'), means: [] } }

    expectReason(session, 'No.0001')
  })

  it.each([
    ['単語データなし', { number: '0009' }, '単語データがありません'],
    ['出題方向違い', { direction: 'ja-to-en' }, '出題方向が不正です'],
    ['出題形式違い', { mode: 'sentence', meanIndex: 0, exampleIndex: 0 }, '出題形式が設定と一致しません'],
    ['問題文なし', { questionText: ' ' }, '問題文がありません'],
    ['履歴キーなし', { historyKey: '' }, '履歴キーがありません'],
    ['見出し語の位置が範囲外', { wordIndex: 1 }, '見出し語が見つかりません'],
  ])('問題の%sを拒否する', (_label, item, reason) => {
    const session = clone(makeClassicSession()) as unknown as { items: Record<string, unknown>[] }
    session.items[0] = { ...session.items[0], ...item }

    expectReason(session, reason)
  })

  it('出題範囲外の番号の問題を拒否する', () => {
    const session = clone(makeClassicSession({ settings: makeClassicSettings({ startNumber: 2, endNumber: 3 }) }))

    expectReason(session, '出題範囲外です')
  })

  it('例文の位置が範囲外なら拒否する', () => {
    const session = clone(
      makeClassicSession({
        settings: makeClassicSettings({ mode: 'sentence' }),
        items: [
          {
            number: '0001',
            mode: 'sentence',
            direction: 'classic-to-modern',
            questionText: '例文',
            historyKey: 'key',
            meanIndex: 0,
            exampleIndex: 1,
          },
        ],
      }),
    )

    expectReason(session, '例文が見つかりません')
  })

  it.each([
    ['問題が空', { items: [] }, '問題がありません'],
    ['進捗が範囲外', { currentIndex: 1 }, '進捗が不正です'],
    ['判定結果の位置が範囲外', { results: { 3: true } }, '判定結果が不正です'],
    ['判定結果が真偽値でない', { results: { 0: 'yes' } }, '判定結果が不正です'],
  ])('%s のセッションを拒否する', (_label, overrides, reason) => {
    expectReason({ ...clone(makeClassicSession()), ...overrides }, reason)
  })
})
