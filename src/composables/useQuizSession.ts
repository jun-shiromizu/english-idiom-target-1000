import { DEFAULT_BOOK_ID, LEGACY_BOOK_ID, STORAGE_KEY_SESSION } from '@/config'
import type { ClozeData, IdiomData, Mean, QuizItem, QuizSession, QuizSettings } from '@/types'
import { useHistory } from './useHistory'
import { formatNumber } from './useGitHubData'

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
  const { isIncorrect } = useHistory()

  function normalizeSettings(settings: QuizSettings): QuizSettings {
    return {
      bookId: settings.bookId ?? DEFAULT_BOOK_ID,
      startNumber: settings.startNumber,
      endNumber: settings.endNumber,
      mode: settings.mode,
      direction: settings.direction ?? 'en-to-ja',
      target: settings.target,
      order: settings.order,
    }
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

    return normalizedSettings.order === 'random' ? shuffle(items) : items
  }

  function buildDictationItems(settings: QuizSettings, dataMap: Map<string, IdiomData>): QuizItem[] {
    const normalizedSettings = normalizeSettings(settings)

    if (normalizedSettings.mode !== 'sentence') {
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

    return normalizedSettings.order === 'random' ? shuffle(items) : items
  }

  function saveSession(session: QuizSession): void {
    localStorage.setItem(
      STORAGE_KEY_SESSION,
      JSON.stringify({ ...session, settings: normalizeSettings(session.settings) }),
    )
  }

  function loadSession(): QuizSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSION)
      if (!raw) return null
      const session = JSON.parse(raw) as QuizSession
      return {
        ...session,
        settings: {
          ...normalizeSettings(session.settings),
          bookId: session.settings.bookId ?? LEGACY_BOOK_ID,
          direction: session.settings.direction ?? 'en-to-ja',
        },
      }
    } catch {
      return null
    }
  }

  function clearSession(): void {
    localStorage.removeItem(STORAGE_KEY_SESSION)
  }

  return { buildItems, buildDictationItems, saveSession, loadSession, clearSession }
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
