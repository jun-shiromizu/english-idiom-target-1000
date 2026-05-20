import { describe, it, expect, beforeEach } from 'vitest'
import { useHistory } from '../useHistory'

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
