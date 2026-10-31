import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY_SETTINGS } from '@/config'
import {
  createDefaultStudySettings,
  loadStudySettings,
  normalizeStudySettings,
  resolveBattleSettingsSource,
  saveStudySettings,
} from '../studySettings'
import type { StudySettingsForm } from '@/types'

const englishSettings: StudySettingsForm = {
  bookId: 'idiom-target-1000',
  startNumber: 11,
  endNumber: 20,
  mode: 'sentence',
  direction: 'ja-to-en',
  target: 'incorrect',
  order: 'random',
  randomQuestionCount: 5,
}

const classicSettings: StudySettingsForm = {
  bookId: 'classic-japanese-330',
  startNumber: 1,
  endNumber: 30,
  mode: 'idiom',
  direction: 'classic-to-modern',
  target: 'all',
  order: 'sequential',
  randomQuestionCount: 10,
}

function stored(): Record<string, unknown> {
  return JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS) ?? 'null') as Record<string, unknown>
}

beforeEach(() => {
  localStorage.clear()
})

describe('normalizeStudySettings', () => {
  it('古文では範囲とランダム出題数を1〜330に収め、方向を古文→現代語にする', () => {
    expect(
      normalizeStudySettings({
        bookId: 'classic-japanese-330',
        startNumber: 1000,
        endNumber: 0,
        direction: 'ja-to-en',
        randomQuestionCount: 500,
      }),
    ).toMatchObject({ startNumber: 1, endNumber: 330, direction: 'classic-to-modern', randomQuestionCount: 330 })
  })

  it('英語教材で古文の方向が保存されていても英語→日本語に戻す', () => {
    expect(normalizeStudySettings({ bookId: 'word-target-1900', direction: 'classic-to-modern' }).direction).toBe(
      'en-to-ja',
    )
  })

  it('未知の教材や不正値は既定値へ戻す', () => {
    expect(normalizeStudySettings({ bookId: 'unknown', startNumber: 'x' })).toMatchObject({
      bookId: createDefaultStudySettings().bookId,
      startNumber: 1,
    })
  })
})

describe('saveStudySettings / loadStudySettings', () => {
  it('英語設定はそのまま保存して復元する', () => {
    saveStudySettings(englishSettings)

    expect(stored()).toEqual(englishSettings)
    expect(loadStudySettings()).toEqual(englishSettings)
  })

  it('古文へ切り替えると直前の英語設定を lastEnglishSettings として保持する', () => {
    saveStudySettings(englishSettings)
    saveStudySettings(classicSettings)
    saveStudySettings({ ...classicSettings, endNumber: 40 })

    expect(stored()).toEqual({ ...classicSettings, endNumber: 40, lastEnglishSettings: englishSettings })
    expect(loadStudySettings()).toEqual({ ...classicSettings, endNumber: 40 })
  })

  it('英語教材へ戻すと lastEnglishSettings を残さない', () => {
    saveStudySettings(englishSettings)
    saveStudySettings(classicSettings)
    saveStudySettings({ ...englishSettings, bookId: 'word-target-1900' })

    expect(stored()).not.toHaveProperty('lastEnglishSettings')
  })

  it('保存値がなければ既定値を返す', () => {
    expect(loadStudySettings()).toEqual(createDefaultStudySettings())
  })
})

describe('resolveBattleSettingsSource', () => {
  it('英語設定はそのまま返す', () => {
    saveStudySettings(englishSettings)

    expect(resolveBattleSettingsSource()).toEqual({ kind: 'english', raw: englishSettings })
  })

  it('古文選択中は退避した英語設定を返す', () => {
    saveStudySettings(englishSettings)
    saveStudySettings(classicSettings)

    expect(resolveBattleSettingsSource()).toEqual({ kind: 'english', raw: englishSettings })
  })

  it('英語設定を一度も保存していない古文設定は利用不可とする', () => {
    saveStudySettings(classicSettings)

    expect(resolveBattleSettingsSource()).toEqual({ kind: 'classic-without-english' })
  })

  it('保存値がなければ既定値で開始できるよう null を返す', () => {
    expect(resolveBattleSettingsSource()).toEqual({ kind: 'english', raw: null })
  })
})
