import { LEGACY_BOOK_ID, STORAGE_KEY_HISTORY } from '@/config'
import type { BookId } from '@/types'
import { formatNumber } from './useGitHubData'

/** localStorage に保存する履歴の型 */
type HistoryRecord = Record<string, boolean>

/** 教材別の履歴キーを生成: 単一なら "bookId:0001"、複数なら "bookId:0001-1" */
function makeKey(bookId: BookId, number: string, idiomIndex: number, totalIdioms: number): string {
  const suffix = totalIdioms > 1 ? `${number}-${idiomIndex}` : number
  return `${bookId}:${suffix}`
}

function makeLegacyKey(number: string, idiomIndex: number, totalIdioms: number): string {
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
  function setResult(
    bookId: BookId,
    number: string,
    idiomIndex: number,
    totalIdioms: number,
    correct: boolean,
  ): void {
    const history = getHistory()
    history[makeKey(bookId, number, idiomIndex, totalIdioms)] = correct
    saveHistory(history)
  }

  /** 指定の熟語の最新回答が不正解かどうか */
  function isIncorrect(bookId: BookId, number: string, idiomIndex: number, totalIdioms: number): boolean {
    const history = getHistory()
    const key = makeKey(bookId, number, idiomIndex, totalIdioms)
    // 未回答は "不正解扱いしない"（出題対象から除外しない）
    if (!(key in history)) {
      if (bookId === LEGACY_BOOK_ID) {
        const legacyKey = makeLegacyKey(number, idiomIndex, totalIdioms)
        return history[legacyKey] === false
      }
      return false
    }
    return history[key] === false
  }

  /** 全履歴をクリア */
  function clearAll(): void {
    localStorage.removeItem(STORAGE_KEY_HISTORY)
  }

  /** 指定範囲の履歴をクリア */
  function clearRange(bookId: BookId, start: number, end: number): void {
    const history = getHistory()
    for (let i = start; i <= end; i++) {
      const num = formatNumber(i)
      const prefix = `${bookId}:${num}`
      Object.keys(history).forEach((key) => {
        if (key === prefix || key.startsWith(`${prefix}-`)) {
          delete history[key]
        }
        if (bookId === LEGACY_BOOK_ID && (key === num || key.startsWith(`${num}-`))) {
          delete history[key]
        }
      })
    }
    saveHistory(history)
  }

  return { getHistory, setResult, isIncorrect, clearAll, clearRange }
}
