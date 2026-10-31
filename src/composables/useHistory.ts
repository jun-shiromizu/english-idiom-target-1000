import { CLASSIC_BOOK_ID, LEGACY_BOOK_ID, STORAGE_KEY_HISTORY, isClassicBookId } from '@/config'
import type { BookId, ClassicWordData, EnglishBookId, QuizDirection, QuizMode } from '@/types'
import { formatNumber } from './useGitHubData'

/** localStorage に保存する履歴の型 */
type HistoryRecord = Record<string, boolean>

const CLASSIC_HISTORY_KEY_VERSION = 'v1'
const CLASSIC_DIRECTION = 'classic-to-modern'

interface HistoryKeyParams {
  bookId: EnglishBookId
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

/** 同一内容の要素数と、その中での出現順を返す */
function getOccurrence<T>(values: T[], index: number, isSame: (a: T, b: T) => boolean): [number, number] {
  const target = values[index]
  const sameIndices = values.flatMap((value, valueIndex) => (isSame(value, target) ? [valueIndex] : []))
  return [sameIndices.length, sameIndices.indexOf(index)]
}

/**
 * 古文の見出し語問題の履歴キー。
 * 区切り文字の衝突を避けるため、型と順序を固定したJSON配列として直列化する。
 */
export function getClassicWordHistoryKey(data: ClassicWordData, wordIndex: number): string {
  const word = data.words[wordIndex]
  const [count, occurrence] = getOccurrence(data.words, wordIndex, (a, b) => a === b)
  return JSON.stringify([
    CLASSIC_HISTORY_KEY_VERSION,
    CLASSIC_BOOK_ID,
    'idiom',
    CLASSIC_DIRECTION,
    data.number,
    'word',
    word,
    count,
    occurrence,
  ])
}

/** 古文の例文問題の履歴キー。意味番号・例文・訳で識別する */
export function getClassicExampleHistoryKey(data: ClassicWordData, meanIndex: number, exampleIndex: number): string {
  const mean = data.means[meanIndex]
  const example = mean.examples[exampleIndex]
  const [count, occurrence] = getOccurrence(
    mean.examples,
    exampleIndex,
    (a, b) => a.text === b.text && a.translation === b.translation,
  )
  return JSON.stringify([
    CLASSIC_HISTORY_KEY_VERSION,
    CLASSIC_BOOK_ID,
    'sentence',
    CLASSIC_DIRECTION,
    data.number,
    'example',
    mean.senseNumber,
    example.text,
    example.translation,
    count,
    occurrence,
  ])
}

function parseClassicHistoryKey(key: string): { bookId: string; number: number } | null {
  if (!key.startsWith('[')) return null
  try {
    const parsed: unknown = JSON.parse(key)
    if (
      !Array.isArray(parsed) ||
      parsed[0] !== CLASSIC_HISTORY_KEY_VERSION ||
      typeof parsed[1] !== 'string' ||
      typeof parsed[4] !== 'string' ||
      !/^\d{4}$/.test(parsed[4])
    ) {
      return null
    }
    return { bookId: parsed[1], number: Number.parseInt(parsed[4], 10) }
  } catch {
    return null
  }
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

  /** 後続の保存に失敗した際に巻き戻せるよう、保存済みの履歴をそのまま返す */
  function snapshotHistory(): string | null {
    return localStorage.getItem(STORAGE_KEY_HISTORY)
  }

  /** snapshotHistory で退避した状態へ履歴を戻す */
  function restoreHistory(snapshot: string | null): void {
    if (snapshot === null) localStorage.removeItem(STORAGE_KEY_HISTORY)
    else localStorage.setItem(STORAGE_KEY_HISTORY, snapshot)
  }

  /** 最新の回答を記録（正解/不正解） */
  function setResult(
    bookId: EnglishBookId,
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

  /** 古文の問題の最新回答を記録 */
  function setClassicResult(historyKey: string, correct: boolean): void {
    const history = getHistory()
    history[historyKey] = correct
    saveHistory(history)
  }

  /** 古文の問題の最新回答が不正解かどうか。未回答は不正解扱いしない */
  function isClassicIncorrect(historyKey: string): boolean {
    return getHistory()[historyKey] === false
  }

  /** 指定の熟語の最新回答が不正解かどうか */
  function isIncorrect(
    bookId: EnglishBookId,
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
    if (isClassicBookId(bookId)) {
      Object.keys(history).forEach((key) => {
        const parsed = parseClassicHistoryKey(key)
        if (parsed && parsed.bookId === bookId && parsed.number >= start && parsed.number <= end) {
          delete history[key]
        }
      })
      saveHistory(history)
      return
    }

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

  return {
    getHistory,
    setResult,
    isIncorrect,
    setClassicResult,
    isClassicIncorrect,
    clearAll,
    clearRange,
    snapshotHistory,
    restoreHistory,
  }
}
