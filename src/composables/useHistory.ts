import { LEGACY_BOOK_ID, STORAGE_KEY_HISTORY } from '@/config'
import type { BookId, QuizDirection, QuizMode } from '@/types'
import { formatNumber } from './useGitHubData'

/** localStorage に保存する履歴の型 */
type HistoryRecord = Record<string, boolean>

interface HistoryKeyParams {
  bookId: BookId
  mode: QuizMode
  direction: QuizDirection
  number: string
  idiomIndex: number
  totalIdioms: number
}

/** 教材・出題条件別の履歴キーを生成 */
function makeKey({ bookId, mode, direction, number, idiomIndex, totalIdioms }: HistoryKeyParams): string {
  const suffix = totalIdioms > 1 ? `${number}-${idiomIndex}` : number
  return `${bookId}:${mode}:${direction}:${suffix}`
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
    mode: QuizMode = 'idiom',
    direction: QuizDirection = 'en-to-ja',
  ): void {
    const history = getHistory()
    history[makeKey({ bookId, mode, direction, number, idiomIndex, totalIdioms })] = correct
    saveHistory(history)
  }

  /** 指定の熟語の最新回答が不正解かどうか */
  function isIncorrect(
    bookId: BookId,
    number: string,
    idiomIndex: number,
    totalIdioms: number,
    mode: QuizMode = 'idiom',
    direction: QuizDirection = 'en-to-ja',
  ): boolean {
    const history = getHistory()
    const key = makeKey({ bookId, mode, direction, number, idiomIndex, totalIdioms })
    // 未回答は "不正解扱いしない"（出題対象から除外しない）
    if (!(key in history)) {
      if (mode === 'idiom' && direction === 'en-to-ja' && bookId === LEGACY_BOOK_ID) {
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
      const prefixes = [
        `${bookId}:idiom:en-to-ja:${num}`,
        `${bookId}:sentence:en-to-ja:${num}`,
        `${bookId}:idiom:ja-to-en:${num}`,
        `${bookId}:sentence:ja-to-en:${num}`,
        `${bookId}:${num}`,
      ]
      Object.keys(history).forEach((key) => {
        if (prefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}-`))) {
          delete history[key]
          return
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
