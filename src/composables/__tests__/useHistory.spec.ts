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
    setResult('0001', 0, 1, true)
    expect(getHistory()['0001']).toBe(true)
  })

  it('不正解を記録できる', () => {
    const { setResult, isIncorrect } = useHistory()
    setResult('0001', 0, 1, false)
    expect(isIncorrect('0001', 0, 1)).toBe(true)
  })

  it('最新の回答で上書きされる', () => {
    const { setResult, isIncorrect } = useHistory()
    setResult('0001', 0, 1, false)
    setResult('0001', 0, 1, true)
    expect(isIncorrect('0001', 0, 1)).toBe(false)
  })

  it('未回答は不正解扱いしない', () => {
    const { isIncorrect } = useHistory()
    expect(isIncorrect('9999', 0, 1)).toBe(false)
  })

  it('熟語が複数の場合はインデックス付きキーで管理する', () => {
    const { setResult, getHistory } = useHistory()
    setResult('0006', 0, 2, true)
    setResult('0006', 1, 2, false)
    expect(getHistory()['0006-0']).toBe(true)
    expect(getHistory()['0006-1']).toBe(false)
  })

  it('全履歴をクリアできる', () => {
    const { setResult, clearAll, getHistory } = useHistory()
    setResult('0001', 0, 1, false)
    setResult('0002', 0, 1, true)
    clearAll()
    expect(getHistory()).toEqual({})
  })

  it('指定範囲の履歴をクリアできる', () => {
    const { setResult, clearRange, getHistory } = useHistory()
    setResult('0001', 0, 1, false)
    setResult('0002', 0, 1, false)
    setResult('0003', 0, 1, false)
    clearRange(1, 2)
    const history = getHistory()
    expect('0001' in history).toBe(false)
    expect('0002' in history).toBe(false)
    expect(history['0003']).toBe(false)
  })
})
