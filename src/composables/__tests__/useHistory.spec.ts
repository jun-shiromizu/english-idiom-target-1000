import { describe, it, expect, beforeEach } from 'vitest'
import { getClassicExampleHistoryKey, getClassicWordHistoryKey, useHistory } from '../useHistory'
import { makeClassicWord } from '@/__tests__/fixtures/classicWords'

describe('useHistory', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('初期状態では空の履歴を返す', () => {
    const { getHistory } = useHistory()
    expect(getHistory()).toEqual({})
  })

  it('正解を記録できる', () => {
    const { setResult, getHistory } = useHistory()
    setResult('idiom-target-1000', '0001', 0, 1, true)
    expect(getHistory()['idiom-target-1000:idiom:en-to-ja:0001']).toBe(true)
  })

  it('不正解を記録できる', () => {
    const { setResult, isIncorrect } = useHistory()
    setResult('idiom-target-1000', '0001', 0, 1, false)
    expect(isIncorrect('idiom-target-1000', '0001', 0, 1)).toBe(true)
  })

  it('出題方向が異なる場合は履歴を分離する', () => {
    const { setResult, isIncorrect } = useHistory()
    setResult('idiom-target-1000', '0001', 0, 1, false, 'idiom', 'ja-to-en')

    expect(isIncorrect('idiom-target-1000', '0001', 0, 1, 'idiom', 'en-to-ja')).toBe(false)
    expect(isIncorrect('idiom-target-1000', '0001', 0, 1, 'idiom', 'ja-to-en')).toBe(true)
  })

  it('最新の回答で上書きされる', () => {
    const { setResult, isIncorrect } = useHistory()
    setResult('idiom-target-1000', '0001', 0, 1, false)
    setResult('idiom-target-1000', '0001', 0, 1, true)
    expect(isIncorrect('idiom-target-1000', '0001', 0, 1)).toBe(false)
  })

  it('未回答は不正解扱いしない', () => {
    const { isIncorrect } = useHistory()
    expect(isIncorrect('idiom-target-1000', '9999', 0, 1)).toBe(false)
  })

  it('熟語が複数の場合はインデックス付きキーで管理する', () => {
    const { setResult, getHistory } = useHistory()
    setResult('idiom-target-1000', '0006', 0, 2, true)
    setResult('idiom-target-1000', '0006', 1, 2, false)
    expect(getHistory()['idiom-target-1000:idiom:en-to-ja:0006-0']).toBe(true)
    expect(getHistory()['idiom-target-1000:idiom:en-to-ja:0006-1']).toBe(false)
  })

  it('全履歴をクリアできる', () => {
    const { setResult, clearAll, getHistory } = useHistory()
    setResult('idiom-target-1000', '0001', 0, 1, false)
    setResult('word-target-1900', '0002', 0, 1, true)
    clearAll()
    expect(getHistory()).toEqual({})
  })

  it('指定範囲の履歴をクリアできる', () => {
    const { setResult, clearRange, getHistory } = useHistory()
    setResult('idiom-target-1000', '0001', 0, 1, false)
    setResult('idiom-target-1000', '0002', 0, 1, false)
    setResult('word-target-1900', '0002', 0, 1, false)
    setResult('idiom-target-1000', '0003', 0, 1, false)
    clearRange('idiom-target-1000', 1, 2)
    const history = getHistory()
    expect('idiom-target-1000:idiom:en-to-ja:0001' in history).toBe(false)
    expect('idiom-target-1000:idiom:en-to-ja:0002' in history).toBe(false)
    expect(history['word-target-1900:idiom:en-to-ja:0002']).toBe(false)
    expect(history['idiom-target-1000:idiom:en-to-ja:0003']).toBe(false)
  })

  it('旧形式の熟語履歴も参照できる', () => {
    localStorage.setItem('idiom-app-history', JSON.stringify({ '0001': false }))

    const { isIncorrect } = useHistory()
    expect(isIncorrect('idiom-target-1000', '0001', 0, 1)).toBe(true)
  })

  it('旧形式の履歴は日本語→英語では参照しない', () => {
    localStorage.setItem('idiom-app-history', JSON.stringify({ '0001': false }))

    const { isIncorrect } = useHistory()
    expect(isIncorrect('idiom-target-1000', '0001', 0, 1, 'idiom', 'ja-to-en')).toBe(false)
  })
})

describe('古文単語330の履歴', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('CJ-11: 見出し語キーは区切り文字を含む見出し語でも衝突しない', () => {
    const a = makeClassicWord('0001', { words: ['あ:い', 'う'] })
    const b = makeClassicWord('0001', { words: ['あ', 'い:う'] })

    expect(getClassicWordHistoryKey(a, 0)).not.toBe(getClassicWordHistoryKey(b, 0))
    expect(JSON.parse(getClassicWordHistoryKey(a, 0))).toEqual([
      'v1',
      'classic-japanese-330',
      'idiom',
      'classic-to-modern',
      '0001',
      'word',
      'あ:い',
      1,
      0,
    ])
  })

  it('CJ-11: 見出し語の並び替えでは同じ履歴を保ち、内容変更では別の履歴にする', () => {
    const original = makeClassicWord('0001', { words: ['甲', '乙'] })
    const reordered = makeClassicWord('0001', { words: ['乙', '甲'] })
    const edited = makeClassicWord('0001', { words: ['甲改', '乙'] })

    expect(getClassicWordHistoryKey(original, 0)).toBe(getClassicWordHistoryKey(reordered, 1))
    expect(getClassicWordHistoryKey(original, 0)).not.toBe(getClassicWordHistoryKey(edited, 0))
  })

  it('CJ-11: 同じ見出し語が重複しても出現順で区別する', () => {
    const data = makeClassicWord('0001', { words: ['同じ', '同じ'] })

    expect(getClassicWordHistoryKey(data, 0)).not.toBe(getClassicWordHistoryKey(data, 1))
  })

  it('CJ-11: 例文キーは意味番号・例文・訳で識別し、訳の変更で別の履歴にする', () => {
    const data = makeClassicWord('0002', {
      means: [
        {
          senseNumber: 1,
          meaning: '意味',
          examples: [
            { text: '例文', translation: '訳' },
            { text: '例文', translation: '訳' },
          ],
        },
        { senseNumber: 2, meaning: '意味2', examples: [{ text: '例文', translation: '訳' }] },
      ],
    })
    const edited = makeClassicWord('0002', {
      means: [{ senseNumber: 1, meaning: '意味', examples: [{ text: '例文', translation: '訳改' }] }],
    })

    const keys = [
      getClassicExampleHistoryKey(data, 0, 0),
      getClassicExampleHistoryKey(data, 0, 1),
      getClassicExampleHistoryKey(data, 1, 0),
    ]
    expect(new Set(keys).size).toBe(3)
    expect(getClassicExampleHistoryKey(edited, 0, 0)).not.toBe(getClassicExampleHistoryKey(data, 0, 0))
  })

  it('最新の回答だけで不正解を判定し、未回答は不正解扱いしない', () => {
    const { setClassicResult, isClassicIncorrect } = useHistory()
    const key = getClassicWordHistoryKey(makeClassicWord('0001'), 0)

    expect(isClassicIncorrect(key)).toBe(false)
    setClassicResult(key, false)
    expect(isClassicIncorrect(key)).toBe(true)
    setClassicResult(key, true)
    expect(isClassicIncorrect(key)).toBe(false)
  })

  it('CJ-12: 古文の範囲クリアは古文の指定範囲だけを削除し、英語履歴を残す', () => {
    const { setClassicResult, setResult, clearRange, getHistory } = useHistory()
    const inRange = getClassicWordHistoryKey(makeClassicWord('0002'), 0)
    const outOfRange = getClassicExampleHistoryKey(makeClassicWord('0004'), 0, 0)
    setClassicResult(inRange, false)
    setClassicResult(outOfRange, false)
    setResult('idiom-target-1000', '0002', 0, 1, false)
    localStorage.setItem(
      'idiom-app-history',
      JSON.stringify({ ...getHistory(), '0002': false, '[broken': false }),
    )

    clearRange('classic-japanese-330', 1, 3)

    expect(getHistory()).toEqual({
      [outOfRange]: false,
      'idiom-target-1000:idiom:en-to-ja:0002': false,
      '0002': false,
      '[broken': false,
    })
  })

  it('CJ-12: 英語の範囲クリアは古文履歴を削除しない', () => {
    const { setClassicResult, setResult, clearRange, getHistory } = useHistory()
    const classicKey = getClassicWordHistoryKey(makeClassicWord('0001'), 0)
    setClassicResult(classicKey, false)
    setResult('idiom-target-1000', '0001', 0, 1, false)

    clearRange('idiom-target-1000', 1, 10)

    expect(getHistory()).toEqual({ [classicKey]: false })
  })
})
