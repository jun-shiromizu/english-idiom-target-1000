import { DEFAULT_BOOK_ID, LEGACY_BOOK_ID, STORAGE_KEY_SESSION } from '@/config'
import type { IdiomData, QuizItem, QuizSession, QuizSettings } from '@/types'
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
        // 熟語モード: idioms 配列の各要素を別々に出題
        data.idioms.forEach((idiom, idiomIndex) => {
          const totalMeans = data.means.length
          const questionText = totalMeans > 1 ? `${idiom} (${totalMeans})` : idiom

          if (
            normalizedSettings.target === 'incorrect' &&
            !isIncorrect(normalizedSettings.bookId, number, idiomIndex, data.idioms.length)
          ) {
            return
          }

          items.push({
            number,
            idiomData: data,
            questionText,
            idiomIndex,
          })
        })
      } else {
        // 例文モード: means 配列の各要素を別々に出題
        data.means.forEach((mean, meanIndex) => {
          const idiomIndex = 0 // 例文モードでは idiomIndex は参照用として 0 を設定
          if (
            normalizedSettings.target === 'incorrect' &&
            !isIncorrect(normalizedSettings.bookId, number, meanIndex, data.means.length)
          ) {
            return
          }

          items.push({
            number,
            idiomData: data,
            questionText: mean['example-sentence'],
            idiomIndex,
            meanIndex,
          })
        })
      }
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
        },
      }
    } catch {
      return null
    }
  }

  function clearSession(): void {
    localStorage.removeItem(STORAGE_KEY_SESSION)
  }

  return { buildItems, saveSession, loadSession, clearSession }
}
