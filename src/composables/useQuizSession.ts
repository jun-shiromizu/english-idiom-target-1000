import { STORAGE_KEY_SESSION } from '@/config'
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

  /**
   * 設定と取得済みデータから QuizItem[] を生成する。
   * supplementHtml は後から設定するため空配列で初期化。
   */
  function buildItems(
    settings: QuizSettings,
    dataMap: Map<string, IdiomData>,
    supplementHtmlMap: Map<string, string[]>,
  ): QuizItem[] {
    const items: QuizItem[] = []

    for (let i = settings.startNumber; i <= settings.endNumber; i++) {
      const number = formatNumber(i)
      const data = dataMap.get(number)
      if (!data) continue

      const supplementHtml = supplementHtmlMap.get(number) ?? []

      if (settings.mode === 'idiom') {
        // 熟語モード: idioms 配列の各要素を別々に出題
        data.idioms.forEach((idiom, idiomIndex) => {
          const totalMeans = data.means.length
          const questionText = totalMeans > 1 ? `${idiom} (${totalMeans})` : idiom

          if (settings.target === 'incorrect' && !isIncorrect(number, idiomIndex, data.idioms.length)) {
            return
          }

          items.push({
            number,
            idiomData: data,
            questionText,
            idiomIndex,
            supplementHtml,
          })
        })
      } else {
        // 例文モード: means 配列の各要素を別々に出題
        data.means.forEach((mean, meanIndex) => {
          const idiomIndex = 0 // 例文モードでは idiomIndex は参照用として 0 を設定
          if (settings.target === 'incorrect' && !isIncorrect(number, meanIndex, data.means.length)) {
            return
          }

          items.push({
            number,
            idiomData: data,
            questionText: mean['example-sentence'],
            idiomIndex,
            meanIndex,
            supplementHtml,
          })
        })
      }
    }

    return settings.order === 'random' ? shuffle(items) : items
  }

  function saveSession(session: QuizSession): void {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session))
  }

  function loadSession(): QuizSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSION)
      return raw ? (JSON.parse(raw) as QuizSession) : null
    } catch {
      return null
    }
  }

  function clearSession(): void {
    localStorage.removeItem(STORAGE_KEY_SESSION)
  }

  return { buildItems, saveSession, loadSession, clearSession }
}
