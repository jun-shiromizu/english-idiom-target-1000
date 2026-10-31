import type { BookId, QuizMode, QuizOrder, QuizTarget, StudyAction, StudyDirection } from '@/types'

type Gtag = (command: string, ...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: Gtag
  }
}

let initialized = false

const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/i

export function createAnalyticsSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function initializeAnalytics(
  measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID,
  isProduction = import.meta.env.PROD,
): boolean {
  if (!isProduction || !measurementId || !MEASUREMENT_ID_PATTERN.test(measurementId)) return false
  if (initialized) return true

  window.dataLayer = window.dataLayer ?? []
  window.gtag = function (..._args: unknown[]) {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: `${window.location.origin}${import.meta.env.BASE_URL}`,
  })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  script.dataset.googleAnalytics = 'true'
  script.addEventListener('error', () => {
    console.error('Google Analytics のタグを読み込めませんでした。')
  })
  document.head.appendChild(script)

  initialized = true
  return true
}

export function isAnalyticsEnabled(): boolean {
  return initialized
}

function sendEvent(eventName: string, parameters: Record<string, string | number | boolean | undefined>): void {
  if (!initialized || !window.gtag) return

  const filteredParameters = Object.fromEntries(
    Object.entries(parameters).filter(([, value]) => value !== undefined),
  )
  window.gtag('event', eventName, filteredParameters)
}

export function trackPageView(path: string): void {
  if (!initialized) return

  const safePath = path.startsWith('/') ? path : '/'
  sendEvent('page_view', {
    page_title: document.title,
    page_path: safePath,
    page_location: `${window.location.origin}${import.meta.env.BASE_URL}#${safePath}`,
  })
}

export interface StudyAnalyticsParameters {
  bookId: BookId
  studyMode: StudyAction
  questionCount: number
  questionMode?: QuizMode
  direction?: StudyDirection
  target?: QuizTarget
  order?: QuizOrder
}

export function trackStudyStarted(parameters: StudyAnalyticsParameters): void {
  if (!initialized) return
  sendEvent('study_started', {
    book_id: parameters.bookId,
    study_mode: parameters.studyMode,
    question_count: parameters.questionCount,
    question_mode: parameters.questionMode,
    direction: parameters.direction,
    target: parameters.target,
    order: parameters.order,
  })
}

export function trackStudyCompleted(
  parameters: StudyAnalyticsParameters & { correctCount: number; incorrectCount: number },
): void {
  sendEvent('study_completed', {
    book_id: parameters.bookId,
    study_mode: parameters.studyMode,
    question_count: parameters.questionCount,
    correct_count: parameters.correctCount,
    incorrect_count: parameters.incorrectCount,
    question_mode: parameters.questionMode,
    direction: parameters.direction,
    target: parameters.target,
    order: parameters.order,
  })
}

export function trackBattleStarted(dungeonId: string, partySize: number): void {
  if (!initialized) return
  sendEvent('battle_started', {
    dungeon_id: dungeonId,
    party_size: partySize,
  })
}

export function trackBattleCompleted(parameters: {
  status: 'cleared' | 'defeated'
  waveCount: number
  turnCount: number
  score: number
}): void {
  sendEvent('battle_completed', {
    battle_status: parameters.status,
    wave_count: parameters.waveCount,
    turn_count: parameters.turnCount,
    score: parameters.score,
  })
}
