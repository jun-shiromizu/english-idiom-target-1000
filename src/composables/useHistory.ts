import { STORAGE_KEY_HISTORY } from '@/config'
import { formatNumber } from './useGitHubData'

/** localStorage に保存する履歴の型 */
type HistoryRecord = Record<string, boolean>

/** 熟語キーを生成: 熟語が1つなら "0001"、複数なら "0001-1" のように idiomIndex を付与 */
function makeKey(number: string, idiomIndex: number, totalIdioms: number): string {
  return totalIdioms > 1 ? `${number}-${idiomIndex}` : number
}

export function useHistory() {
  function getHistory(): HistoryRecord {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY)
      return raw ? (JSON.parse(raw) as HistoryRecord) : {}
    } catch {
      return {}
    }
  }

  function saveHistory(history: HistoryRecord): void {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history))
  }

  /** 最新の回答を記録（正解/不正解） */
  function setResult(number: string, idiomIndex: number, totalIdioms: number, correct: boolean): void {
    const history = getHistory()
    history[makeKey(number, idiomIndex, totalIdioms)] = correct
    saveHistory(history)
  }

  /** 指定の熟語の最新回答が不正解かどうか */
  function isIncorrect(number: string, idiomIndex: number, totalIdioms: number): boolean {
    const history = getHistory()
    const key = makeKey(number, idiomIndex, totalIdioms)
    // 未回答は "不正解扱いしない"（出題対象から除外しない）
    if (!(key in history)) return false
    return history[key] === false
  }

  /** 全履歴をクリア */
  function clearAll(): void {
    localStorage.removeItem(STORAGE_KEY_HISTORY)
  }

  /** 指定範囲の履歴をクリア */
  function clearRange(start: number, end: number): void {
    const history = getHistory()
    for (let i = start; i <= end; i++) {
      const num = formatNumber(i)
      // "0001" と "0001-0", "0001-1" ... の両パターンを削除
      Object.keys(history).forEach((key) => {
        if (key === num || key.startsWith(`${num}-`)) {
          delete history[key]
        }
      })
    }
    saveHistory(history)
  }

  return { getHistory, setResult, isIncorrect, clearAll, clearRange }
}
