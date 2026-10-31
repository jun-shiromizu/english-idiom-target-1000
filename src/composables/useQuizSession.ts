import { DEFAULT_BOOK_ID, LEGACY_BOOK_ID, STORAGE_KEY_SESSION } from '@/config'
import type {
  ClassicQuizItem,
  ClassicQuizSession,
  ClassicQuizSettings,
  ClassicWordData,
  ClozeData,
  IdiomData,
  Mean,
  QuizItem,
  QuizOrder,
  QuizSession,
  QuizSettings,
  StoredQuizSessionState,
} from '@/types'
import { isClassicQuizSession, isClassicSessionLike, parseClassicQuizSession } from '@/utils/classicSession'
import { SessionSaveError } from '@/utils/sessionErrors'
import { createAnalyticsSessionId } from '@/utils/analytics'
import { getClassicExampleHistoryKey, getClassicWordHistoryKey, useHistory } from './useHistory'
import { formatNumber } from './useGitHubData'

export { SessionSaveError } from '@/utils/sessionErrors'
export { isClassicQuizSession } from '@/utils/classicSession'

/** Fisher-Yates シャッフル */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function useQuizSession() {
  const { isIncorrect, isClassicIncorrect } = useHistory()

  function normalizeSettings(settings: QuizSettings): QuizSettings {
    return {
      bookId: settings.bookId ?? DEFAULT_BOOK_ID,
      startNumber: settings.startNumber,
      endNumber: settings.endNumber,
      mode: settings.mode,
      direction: settings.direction ?? 'en-to-ja',
      target: settings.target,
      order: settings.order,
      randomQuestionCount: settings.randomQuestionCount,
    }
  }

  function orderAndLimitItems<T>(
    items: T[],
    settings: { order: QuizOrder; randomQuestionCount?: number },
  ): T[] {
    const orderedItems = settings.order === 'random' ? shuffle(items) : items
    if (settings.order !== 'random' || settings.randomQuestionCount === undefined) {
      return orderedItems
    }

    return orderedItems.slice(0, Math.max(0, Math.floor(settings.randomQuestionCount)))
  }

  /**
   * 設定と取得済みデータから QuizItem[] を生成する。
   */
  function buildItems(settings: QuizSettings, dataMap: Map<string, IdiomData>): QuizItem[] {
    const normalizedSettings = normalizeSettings(settings)
    const items: QuizItem[] = []

    for (let i = normalizedSettings.startNumber; i <= normalizedSettings.endNumber; i++) {
      const number = formatNumber(i)
      const data = dataMap.get(number)
      if (!data) continue

      if (normalizedSettings.mode === 'idiom') {
        if (normalizedSettings.direction === 'en-to-ja') {
          // 英語→日本語: idioms 配列の各要素を別々に出題
          data.idioms.forEach((idiom, idiomIndex) => {
            const totalMeans = data.means.length
            const questionText = totalMeans > 1 ? `${idiom} (${totalMeans})` : idiom

            if (
              normalizedSettings.target === 'incorrect' &&
              !isIncorrect(
                normalizedSettings.bookId,
                number,
                idiomIndex,
                data.idioms.length,
                normalizedSettings.mode,
                normalizedSettings.direction,
              )
            ) {
              return
            }

            items.push({
              number,
              bookId: normalizedSettings.bookId,
              idiomData: data,
              mode: 'idiom',
              direction: normalizedSettings.direction,
              questionText,
              idiomIndex,
            })
          })
        } else {
          // 日本語→英語: means 配列の各要素を別々に出題
          data.means.forEach((mean, meanIndex) => {
            const idiomIndex = 0
            if (
              normalizedSettings.target === 'incorrect' &&
              !isIncorrect(
                normalizedSettings.bookId,
                number,
                meanIndex,
                data.means.length,
                normalizedSettings.mode,
                normalizedSettings.direction,
              )
            ) {
              return
            }

            items.push({
              number,
              bookId: normalizedSettings.bookId,
              idiomData: data,
              mode: 'idiom',
              direction: normalizedSettings.direction,
              questionText: mean['idiom-jp'],
              idiomIndex,
              meanIndex,
            })
          })
        }
      } else {
        // 例文モード: means 配列の各要素を別々に出題
        data.means.forEach((mean, meanIndex) => {
          const idiomIndex = 0 // 例文モードでは idiomIndex は参照用として 0 を設定
          if (
            normalizedSettings.target === 'incorrect' &&
            !isIncorrect(
              normalizedSettings.bookId,
              number,
              meanIndex,
              data.means.length,
              normalizedSettings.mode,
              normalizedSettings.direction,
            )
          ) {
            return
          }

          items.push({
            number,
            bookId: normalizedSettings.bookId,
            idiomData: data,
            mode: 'sentence',
            direction: normalizedSettings.direction,
            questionText:
              normalizedSettings.direction === 'en-to-ja'
                ? mean['example-sentence']
                : mean['sentence-jp'],
            idiomIndex,
            meanIndex,
          })
        })
      }
    }

    return orderAndLimitItems(items, normalizedSettings)
  }

  /**
   * 古文の問題を生成する。見出し語は表記ごとに1問、例文は意味×例文ごとに1問。
   * 絞り込み → 生成 → 並べ替え → 件数制限の順で処理する。
   */
  function buildClassicItems(
    settings: ClassicQuizSettings,
    dataMap: Map<string, ClassicWordData>,
  ): ClassicQuizItem[] {
    const items: ClassicQuizItem[] = []
    const shouldInclude = (historyKey: string) =>
      settings.target !== 'incorrect' || isClassicIncorrect(historyKey)

    for (let i = settings.startNumber; i <= settings.endNumber; i++) {
      const number = formatNumber(i)
      const data = dataMap.get(number)
      if (!data) continue

      if (settings.mode === 'idiom') {
        data.words.forEach((word, wordIndex) => {
          const historyKey = getClassicWordHistoryKey(data, wordIndex)
          if (!shouldInclude(historyKey)) return
          items.push({
            number,
            mode: 'idiom',
            direction: 'classic-to-modern',
            questionText: word,
            historyKey,
            wordIndex,
          })
        })
        continue
      }

      data.means.forEach((mean, meanIndex) => {
        mean.examples.forEach((example, exampleIndex) => {
          const historyKey = getClassicExampleHistoryKey(data, meanIndex, exampleIndex)
          if (!shouldInclude(historyKey)) return
          items.push({
            number,
            mode: 'sentence',
            direction: 'classic-to-modern',
            questionText: example.text,
            historyKey,
            meanIndex,
            exampleIndex,
          })
        })
      })
    }

    return orderAndLimitItems(items, settings)
  }

  /** 問題が参照する番号の単語データだけを1回ずつ保持したセッションを作る */
  function createClassicSession(
    settings: ClassicQuizSettings,
    items: ClassicQuizItem[],
    dataMap: Map<string, ClassicWordData>,
  ): ClassicQuizSession {
    const words: Record<string, ClassicWordData> = {}
    items.forEach((item) => {
      const data = dataMap.get(item.number)
      if (data) words[item.number] = data
    })
    return {
      contentType: 'classic-japanese',
      sessionType: 'quiz',
      analyticsSessionId: createAnalyticsSessionId(),
      analyticsCompletionSent: false,
      settings: { ...settings },
      words,
      items,
      currentIndex: 0,
      results: {},
    }
  }

  function buildDictationItems(settings: QuizSettings, dataMap: Map<string, IdiomData>): QuizItem[] {
    const normalizedSettings = normalizeSettings(settings)

    if (
      normalizedSettings.bookId !== 'word-target-1900' ||
      normalizedSettings.mode !== 'idiom' ||
      normalizedSettings.direction !== 'ja-to-en'
    ) {
      return []
    }

    return buildItems(normalizedSettings, dataMap)
  }

  function buildClozeItems(settings: QuizSettings, dataMap: Map<string, IdiomData>): QuizItem[] {
    const normalizedSettings = normalizeSettings(settings)

    if (
      normalizedSettings.mode !== 'sentence' ||
      normalizedSettings.direction !== 'en-to-ja'
    ) {
      return []
    }

    const items: QuizItem[] = []

    for (let i = normalizedSettings.startNumber; i <= normalizedSettings.endNumber; i++) {
      const number = formatNumber(i)
      const data = dataMap.get(number)
      if (!data) continue

      data.means.forEach((mean, meanIndex) => {
        if (!hasValidCloze(mean.cloze)) return

        if (
          normalizedSettings.target === 'incorrect' &&
          !isIncorrect(
            normalizedSettings.bookId,
            number,
            meanIndex,
            data.means.length,
            normalizedSettings.mode,
            normalizedSettings.direction,
          )
        ) {
          return
        }

        items.push({
          number,
          bookId: normalizedSettings.bookId,
          idiomData: data,
          mode: 'sentence',
          direction: normalizedSettings.direction,
          questionText: mean.cloze.maskedText,
          idiomIndex: 0,
          meanIndex,
          cloze: {
            ...mean.cloze,
            choices: shuffle(mean.cloze.choices),
          },
        })
      })
    }

    return orderAndLimitItems(items, normalizedSettings)
  }

  function writeSession(value: unknown): void {
    try {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(value))
    } catch (error) {
      throw new SessionSaveError({ cause: error })
    }
  }

  function saveSession(session: QuizSession | ClassicQuizSession): void {
    const sessionWithAnalytics = {
      ...session,
      analyticsSessionId: session.analyticsSessionId ?? createAnalyticsSessionId(),
      analyticsCompletionSent: session.analyticsCompletionSent ?? false,
    }

    if (isClassicQuizSession(sessionWithAnalytics)) {
      writeSession(sessionWithAnalytics)
      return
    }
    writeSession({ ...sessionWithAnalytics, settings: normalizeSettings(sessionWithAnalytics.settings) })
  }

  function normalizeStoredEnglishSession(session: QuizSession): QuizSession {
    return {
      ...session,
      analyticsSessionId: session.analyticsSessionId ?? createAnalyticsSessionId(),
      analyticsCompletionSent: session.analyticsCompletionSent ?? false,
      settings: {
        ...normalizeSettings(session.settings),
        bookId: session.settings.bookId ?? LEGACY_BOOK_ID,
        direction: session.settings.direction ?? 'en-to-ja',
      },
    }
  }

  /** 保存済みセッションを英語・古文・不正な古文に分類して返す */
  function loadStoredSession(): StoredQuizSessionState {
    let parsed: unknown
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSION)
      if (!raw) return { kind: 'none' }
      parsed = JSON.parse(raw)
    } catch {
      return { kind: 'none' }
    }

    if (isClassicSessionLike(parsed)) {
      const result = parseClassicQuizSession(parsed)
      if (!result.ok) return { kind: 'invalid-classic', reason: result.reason }
      return {
        kind: 'classic',
        session: {
          ...result.session,
          analyticsSessionId: result.session.analyticsSessionId ?? createAnalyticsSessionId(),
          analyticsCompletionSent: result.session.analyticsCompletionSent ?? false,
        },
      }
    }

    try {
      return { kind: 'english', session: normalizeStoredEnglishSession(parsed as QuizSession) }
    } catch {
      return { kind: 'none' }
    }
  }

  /** 英語教材のセッションだけを返す。古文セッションは英語専用画面へ渡さない */
  function loadSession(): QuizSession | null {
    const stored = loadStoredSession()
    return stored.kind === 'english' ? stored.session : null
  }

  function clearSession(): void {
    localStorage.removeItem(STORAGE_KEY_SESSION)
  }

  return {
    buildItems,
    buildDictationItems,
    buildClozeItems,
    buildClassicItems,
    createClassicSession,
    saveSession,
    loadStoredSession,
    loadSession,
    clearSession,
  }
}

function hasValidCloze(cloze: Mean['cloze']): cloze is ClozeData {
  return Boolean(
    cloze &&
      cloze.maskedText.trim() &&
      cloze.answerBase.trim() &&
      cloze.answerSurface.trim() &&
      Array.isArray(cloze.choices) &&
      cloze.choices.length === 4 &&
      cloze.choices.every((choice) => choice.trim().length > 0),
  )
}
