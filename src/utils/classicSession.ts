import { CLASSIC_BOOK_ID, getBookConfig } from '@/config'
import type {
  ClassicQuizItem,
  ClassicQuizSession,
  ClassicQuizSettings,
  ClassicWordData,
  QuizSession,
} from '@/types'
import { ClassicDataError, isRecord, parseClassicWordData } from './classicWordData'

export type ClassicSessionParseResult =
  | { ok: true; session: ClassicQuizSession }
  | { ok: false; reason: string }

export function isClassicQuizSession(session: QuizSession | ClassicQuizSession): session is ClassicQuizSession {
  return 'contentType' in session && session.contentType === 'classic-japanese'
}

class ClassicSessionError extends Error {}

function fail(reason: string): never {
  throw new ClassicSessionError(reason)
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

/** 古文セッションとして保存されたデータかどうか（形式の正否は問わない） */
export function isClassicSessionLike(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value.contentType === 'classic-japanese' ||
      (isRecord(value.settings) && value.settings.bookId === CLASSIC_BOOK_ID))
  )
}

function parseSettings(value: unknown): ClassicQuizSettings {
  if (!isRecord(value)) fail('出題設定がありません')
  const maxNumber = getBookConfig(CLASSIC_BOOK_ID).maxNumber
  if (value.bookId !== CLASSIC_BOOK_ID) fail('教材が古文単語330ではありません')
  if (!isIntegerInRange(value.startNumber, 1, maxNumber) || !isIntegerInRange(value.endNumber, 1, maxNumber)) {
    fail('出題範囲が不正です')
  }
  if (value.startNumber > value.endNumber) fail('出題範囲が不正です')
  if (value.mode !== 'idiom' && value.mode !== 'sentence') fail('出題形式が不正です')
  if (value.direction !== 'classic-to-modern') fail('古文単語330が対応していない出題方向です')
  if (value.target !== 'all' && value.target !== 'incorrect') fail('出題対象が不正です')
  if (value.order !== 'sequential' && value.order !== 'random') fail('出題順序が不正です')
  if (value.randomQuestionCount !== undefined && !isIntegerInRange(value.randomQuestionCount, 1, maxNumber)) {
    fail('ランダム出題数が不正です')
  }

  return {
    bookId: CLASSIC_BOOK_ID,
    startNumber: value.startNumber,
    endNumber: value.endNumber,
    mode: value.mode,
    direction: 'classic-to-modern',
    target: value.target,
    order: value.order,
    randomQuestionCount: value.randomQuestionCount,
  }
}

function parseWords(value: unknown): Record<string, ClassicWordData> {
  if (!isRecord(value)) fail('単語データがありません')
  const words: Record<string, ClassicWordData> = {}
  for (const [number, data] of Object.entries(value)) {
    try {
      words[number] = parseClassicWordData(data, number)
    } catch (error) {
      if (error instanceof ClassicDataError) fail(error.message)
      throw error
    }
  }
  return words
}

function parseItem(
  value: unknown,
  index: number,
  settings: ClassicQuizSettings,
  words: Record<string, ClassicWordData>,
): ClassicQuizItem {
  const label = `${index + 1}問目`
  if (!isRecord(value)) fail(`${label}のデータが不正です`)
  if (typeof value.number !== 'string' || !words[value.number]) fail(`${label}の単語データがありません`)
  const number = value.number
  const numericNumber = Number.parseInt(number, 10)
  if (numericNumber < settings.startNumber || numericNumber > settings.endNumber) fail(`${label}が出題範囲外です`)
  if (value.direction !== 'classic-to-modern') fail(`${label}の出題方向が不正です`)
  if (value.mode !== settings.mode) fail(`${label}の出題形式が設定と一致しません`)
  if (typeof value.questionText !== 'string' || value.questionText.trim().length === 0) {
    fail(`${label}の問題文がありません`)
  }
  if (typeof value.historyKey !== 'string' || value.historyKey.length === 0) fail(`${label}の履歴キーがありません`)

  const data = words[number]
  if (value.mode === 'idiom') {
    if (!isIntegerInRange(value.wordIndex, 0, data.words.length - 1)) fail(`${label}の見出し語が見つかりません`)
    return {
      number,
      mode: 'idiom',
      direction: 'classic-to-modern',
      questionText: value.questionText,
      historyKey: value.historyKey,
      wordIndex: value.wordIndex,
    }
  }

  if (!isIntegerInRange(value.meanIndex, 0, data.means.length - 1)) fail(`${label}の意味が見つかりません`)
  const examples = data.means[value.meanIndex].examples
  if (!isIntegerInRange(value.exampleIndex, 0, examples.length - 1)) fail(`${label}の例文が見つかりません`)
  return {
    number,
    mode: 'sentence',
    direction: 'classic-to-modern',
    questionText: value.questionText,
    historyKey: value.historyKey,
    meanIndex: value.meanIndex,
    exampleIndex: value.exampleIndex,
  }
}

function parseResults(value: unknown, itemCount: number): Record<number, boolean> {
  if (!isRecord(value)) fail('判定結果が不正です')
  const results: Record<number, boolean> = {}
  for (const [key, result] of Object.entries(value)) {
    const index = Number(key)
    if (!isIntegerInRange(index, 0, itemCount - 1) || typeof result !== 'boolean') fail('判定結果が不正です')
    results[index] = result
  }
  return results
}

function parseSession(value: unknown): ClassicQuizSession {
  if (!isRecord(value)) fail('セッションの形式が不正です')
  if (value.contentType !== 'classic-japanese') fail('セッションの形式が不正です')
  if (value.sessionType !== 'quiz') fail('古文単語330は単語帳以外の学習モードに対応していません')

  const settings = parseSettings(value.settings)
  const words = parseWords(value.words)
  if (!Array.isArray(value.items) || value.items.length === 0) fail('問題がありません')
  const items = value.items.map((item, index) => parseItem(item, index, settings, words))
  if (!isIntegerInRange(value.currentIndex, 0, items.length - 1)) fail('進捗が不正です')

  return {
    contentType: 'classic-japanese',
    sessionType: 'quiz',
    settings,
    words,
    items,
    currentIndex: value.currentIndex,
    results: parseResults(value.results, items.length),
  }
}

/** 保存済みの古文セッションを検証する。不正な場合は理由を返す */
export function parseClassicQuizSession(value: unknown): ClassicSessionParseResult {
  try {
    return { ok: true, session: parseSession(value) }
  } catch (error) {
    if (error instanceof ClassicSessionError) return { ok: false, reason: error.message }
    throw error
  }
}
