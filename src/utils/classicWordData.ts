import type { ClassicExample, ClassicMean, ClassicSourcePage, ClassicWordData } from '@/types'

export type ClassicDataErrorKind = 'list-failed' | 'missing' | 'invalid' | 'fetch-failed'

/** 古文データの取得・検証エラー。利用者向けメッセージに番号・項目を含める */
export class ClassicDataError extends Error {
  readonly kind: ClassicDataErrorKind
  readonly numbers: string[]

  constructor(kind: ClassicDataErrorKind, message: string, numbers: string[] = [], options?: ErrorOptions) {
    super(message, options)
    this.name = 'ClassicDataError'
    this.kind = kind
    this.numbers = numbers
  }
}

class ClassicFieldError extends Error {
  readonly path: string
  readonly detail: string

  constructor(path: string, detail: string) {
    super(`${path}: ${detail}`)
    this.path = path
    this.detail = detail
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function requireArray(value: unknown, path: string, minLength = 0): unknown[] {
  if (!Array.isArray(value)) {
    throw new ClassicFieldError(path, '配列ではありません')
  }
  if (value.length < minLength) {
    throw new ClassicFieldError(path, `${minLength}件以上必要です`)
  }
  return value
}

function requireNonEmptyString(value: unknown, path: string): string {
  if (!isNonEmptyString(value)) {
    throw new ClassicFieldError(path, '空でない文字列ではありません')
  }
  return value
}

function parseExample(value: unknown, path: string): ClassicExample {
  if (!isRecord(value)) throw new ClassicFieldError(path, 'オブジェクトではありません')
  return {
    text: requireNonEmptyString(value.text, `${path}.text`),
    translation: requireNonEmptyString(value.translation, `${path}.translation`),
  }
}

function parseMean(value: unknown, path: string): ClassicMean {
  if (!isRecord(value)) throw new ClassicFieldError(path, 'オブジェクトではありません')
  if (!isPositiveInteger(value.senseNumber)) {
    throw new ClassicFieldError(`${path}.senseNumber`, '正の整数ではありません')
  }
  return {
    senseNumber: value.senseNumber,
    meaning: requireNonEmptyString(value.meaning, `${path}.meaning`),
    examples: requireArray(value.examples, `${path}.examples`).map((example, index) =>
      parseExample(example, `${path}.examples[${index}]`),
    ),
  }
}

function parseSourcePage(value: unknown, path: string): ClassicSourcePage {
  if (!isRecord(value)) throw new ClassicFieldError(path, 'オブジェクトではありません')
  if (!isPositiveInteger(value.bookPage)) {
    throw new ClassicFieldError(`${path}.bookPage`, '正の整数ではありません')
  }
  return {
    bookPage: value.bookPage,
    image: requireNonEmptyString(value.image, `${path}.image`),
  }
}

function parseWordData(value: unknown, expectedNumber: string): ClassicWordData {
  if (!isRecord(value)) throw new ClassicFieldError('(root)', 'オブジェクトではありません')
  if (value.number !== expectedNumber) {
    throw new ClassicFieldError('number', `ファイル名の番号 ${expectedNumber} と一致しません`)
  }

  const words = requireArray(value.words, 'words', 1).map((word, index) =>
    requireNonEmptyString(word, `words[${index}]`),
  )
  const means = requireArray(value.means, 'means', 1).map((mean, index) => parseMean(mean, `means[${index}]`))
  const senseNumbers = new Set<number>()
  means.forEach((mean, index) => {
    if (senseNumbers.has(mean.senseNumber)) {
      throw new ClassicFieldError(`means[${index}].senseNumber`, '同じ単語内で重複しています')
    }
    senseNumbers.add(mean.senseNumber)
  })

  return {
    number: expectedNumber,
    words,
    means,
    points: requireArray(value.points, 'points').map((point, index) => {
      if (typeof point !== 'string') throw new ClassicFieldError(`points[${index}]`, '文字列ではありません')
      return point
    }),
    sourcePages: requireArray(value.sourcePages, 'sourcePages').map((page, index) =>
      parseSourcePage(page, `sourcePages[${index}]`),
    ),
  }
}

/**
 * パース済みJSONを古文データ契約で検証し、契約上の項目だけを持つ新しいオブジェクトを返す。
 * 表示文字列は加工しない。
 */
export function parseClassicWordData(value: unknown, expectedNumber: string): ClassicWordData {
  try {
    return parseWordData(value, expectedNumber)
  } catch (error) {
    if (error instanceof ClassicFieldError) {
      throw new ClassicDataError(
        'invalid',
        `古文単語330の No.${expectedNumber} のデータ形式が不正です（${error.path}: ${error.detail}）。`,
        [expectedNumber],
      )
    }
    throw error
  }
}

/** 出典ページ番号を重複なく配列順に返す */
export function getUniqueBookPages(data: ClassicWordData): number[] {
  return [...new Set(data.sourcePages.map((page) => page.bookPage))]
}

export function formatNumberList(numbers: string[], limit = 5): string {
  const shown = numbers.slice(0, limit).map((number) => `No.${number}`).join('、')
  return numbers.length > limit ? `${shown} ほか${numbers.length - limit}件` : shown
}
