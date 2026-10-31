import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadAnalytics() {
  vi.resetModules()
  return import('../analytics')
}

afterEach(() => {
  document.head.querySelectorAll('script[data-google-analytics]').forEach((script) => script.remove())
  delete window.gtag
  window.dataLayer = []
  sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('Google Analytics', () => {
  it('本番以外では初期化しない', async () => {
    const analytics = await loadAnalytics()

    expect(analytics.initializeAnalytics('G-TEST123', false)).toBe(false)
    expect(document.head.querySelector('script[data-google-analytics]')).toBeNull()
  })

  it('測定IDが不正な場合は初期化しない', async () => {
    const analytics = await loadAnalytics()

    expect(analytics.initializeAnalytics('not-a-measurement-id', true)).toBe(false)
    expect(document.head.querySelector('script[data-google-analytics]')).toBeNull()
  })

  it('ページビューと安全な学習イベントをキューへ送る', async () => {
    const analytics = await loadAnalytics()

    expect(analytics.initializeAnalytics('G-TEST123', true)).toBe(true)
    analytics.trackPageView('/quiz')
    analytics.trackStudyStarted({
      bookId: 'word-target-1900',
      studyMode: 'quiz',
      questionCount: 20,
      questionMode: 'idiom',
      direction: 'en-to-ja',
      target: 'all',
      order: 'random',
    })
    analytics.trackStudyCompleted({
      bookId: 'word-target-1900',
      studyMode: 'quiz',
      questionCount: 20,
      correctCount: 15,
      incorrectCount: 5,
    })
    analytics.trackStudyCompleted({
      bookId: 'word-target-1900',
      studyMode: 'quiz',
      questionCount: 20,
      correctCount: 15,
      incorrectCount: 5,
    })

    expect(window.dataLayer).toContainEqual(['config', 'G-TEST123', expect.objectContaining({
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    })])
    expect(window.dataLayer).toContainEqual(['event', 'page_view', expect.objectContaining({ page_path: '/quiz' })])
    expect(window.dataLayer).toContainEqual(['event', 'study_started', expect.objectContaining({
      book_id: 'word-target-1900',
      study_mode: 'quiz',
      question_count: 20,
    })])
    expect(window.dataLayer).toContainEqual(['event', 'study_completed', expect.objectContaining({
      correct_count: 15,
      incorrect_count: 5,
    })])
    expect(window.dataLayer.filter((entry) => Array.isArray(entry) && entry[1] === 'study_completed')).toHaveLength(1)

    analytics.trackStudyStarted({
      bookId: 'word-target-1900',
      studyMode: 'quiz',
      questionCount: 20,
    })
    analytics.trackStudyCompleted({
      bookId: 'word-target-1900',
      studyMode: 'quiz',
      questionCount: 20,
      correctCount: 15,
      incorrectCount: 5,
    })
    expect(window.dataLayer.filter((entry) => Array.isArray(entry) && entry[1] === 'study_completed')).toHaveLength(2)
    expect(JSON.stringify(window.dataLayer)).not.toContain('questionText')
  })
})
