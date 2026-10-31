import {
  DEFAULT_BOOK_ID,
  STORAGE_KEY_SETTINGS,
  getBookConfig,
  isBookId,
  isClassicBookId,
  isEnglishBookId,
} from '@/config'
import type { QuizSettings, StudySettingsForm } from '@/types'
import { isRecord } from './classicWordData'

export const DEFAULT_RANDOM_QUESTION_COUNT = 100

/** 保存済み設定のバトル用解決結果 */
export type BattleSettingsSource =
  | { kind: 'english'; raw: Partial<QuizSettings> | null }
  | { kind: 'classic-without-english' }

export function createDefaultStudySettings(): StudySettingsForm {
  return {
    bookId: DEFAULT_BOOK_ID,
    startNumber: 1,
    endNumber: 100,
    mode: 'idiom',
    direction: 'en-to-ja',
    target: 'all',
    order: 'sequential',
    randomQuestionCount: DEFAULT_RANDOM_QUESTION_COUNT,
  }
}

function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** トップ画面の入力値を教材の範囲・対応方向へ正規化する */
export function normalizeStudySettings(raw: unknown): StudySettingsForm {
  const defaults = createDefaultStudySettings()
  const source = isRecord(raw) ? raw : null
  const bookId = isBookId(source?.bookId) ? source.bookId : defaults.bookId
  const maxNumber = getBookConfig(bookId).maxNumber
  const clamp = (value: number) => Math.min(Math.max(value, 1), maxNumber)
  const startNumber = clamp(toFiniteNumber(source?.startNumber, defaults.startNumber))
  const endNumber = clamp(toFiniteNumber(source?.endNumber, defaults.endNumber))
  const randomQuestionCount =
    source === null
      ? DEFAULT_RANDOM_QUESTION_COUNT
      : source.randomQuestionCount === undefined
        ? undefined
        : clamp(toFiniteNumber(source.randomQuestionCount, DEFAULT_RANDOM_QUESTION_COUNT))

  return {
    bookId,
    startNumber: Math.min(startNumber, endNumber),
    endNumber: Math.max(startNumber, endNumber),
    mode: source?.mode === 'sentence' ? 'sentence' : defaults.mode,
    direction: isClassicBookId(bookId)
      ? 'classic-to-modern'
      : source?.direction === 'ja-to-en'
        ? 'ja-to-en'
        : 'en-to-ja',
    target: source?.target === 'incorrect' ? 'incorrect' : defaults.target,
    order: source?.order === 'random' ? 'random' : defaults.order,
    randomQuestionCount,
  }
}

function readStoredSettings(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS)
    return raw ? (JSON.parse(raw) as unknown) : null
  } catch {
    return null
  }
}

/** 古文選択中に保持している、切り替え直前の英語設定 */
function getStoredEnglishSettings(stored: unknown): Record<string, unknown> | null {
  if (!isRecord(stored)) return null
  if (isEnglishBookId(stored.bookId)) {
    const englishSettings = { ...stored }
    delete englishSettings.lastEnglishSettings
    return englishSettings
  }
  if (isRecord(stored.lastEnglishSettings) && isEnglishBookId(stored.lastEnglishSettings.bookId)) {
    return stored.lastEnglishSettings
  }
  return null
}

export function loadStudySettings(): StudySettingsForm {
  const stored = readStoredSettings()
  return stored === null ? createDefaultStudySettings() : normalizeStudySettings(stored)
}

/**
 * トップ画面の設定を保存する。古文選択中は、古文へ切り替える直前の英語設定を
 * lastEnglishSettings として保持し、古文設定の保存で上書きしない。
 */
export function saveStudySettings(settings: StudySettingsForm): void {
  const normalized = normalizeStudySettings(settings)
  if (isEnglishBookId(normalized.bookId)) {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(normalized))
    return
  }

  const lastEnglishSettings = getStoredEnglishSettings(readStoredSettings())
  localStorage.setItem(
    STORAGE_KEY_SETTINGS,
    JSON.stringify(lastEnglishSettings ? { ...normalized, lastEnglishSettings } : normalized),
  )
}

/** バトルで使う英語設定を解決する。古文選択中は退避した英語設定を使う */
export function resolveBattleSettingsSource(): BattleSettingsSource {
  const stored = readStoredSettings()
  if (!isRecord(stored)) return { kind: 'english', raw: null }
  if (!isClassicBookId(stored.bookId)) return { kind: 'english', raw: stored as Partial<QuizSettings> }

  const englishSettings = getStoredEnglishSettings(stored)
  return englishSettings
    ? { kind: 'english', raw: englishSettings as Partial<QuizSettings> }
    : { kind: 'classic-without-english' }
}

export const CLASSIC_BATTLE_UNSUPPORTED_MESSAGE =
  '古文単語330はバトルに対応していません。トップで英語教材を選択してから再開してください。'
