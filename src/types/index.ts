export interface IdiomData {
  idioms: string[]
  means: Mean[]
  notes: string[]
}

export interface Mean {
  'idiom-jp': string
  synonyms?: string[]
  partOfSpeech?: PartOfSpeech
  choiceType?: ChoiceType
  'example-sentence': string
  'sentence-jp': string
  cloze?: ClozeData
}

export interface ClozeData {
  maskedText: string
  answerBase: string
  answerSurface: string
  choices: string[]
}

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'phrase'
  | 'other'

export type ChoiceType =
  | 'transitive-verb'
  | 'intransitive-verb'
  | 'verb-phrase'
  | 'noun'
  | 'adjective'
  | 'adverb'
  | 'prepositional-phrase'
  | 'conjunction-phrase'
  | 'quantity-expression'
  | 'comparative-expression'
  | 'idiomatic-expression'
  | 'other'

export type BookId = 'idiom-target-1000' | 'word-target-1900'
export type QuizMode = 'idiom' | 'sentence'
export type QuizDirection = 'en-to-ja' | 'ja-to-en'
export type QuizTarget = 'all' | 'incorrect'
export type QuizOrder = 'sequential' | 'random'
export type GameDifficulty = 'easy' | 'normal' | 'hard'
export type ThemeId = string

export interface QuizSettings {
  bookId: BookId
  startNumber: number
  endNumber: number
  mode: QuizMode
  direction: QuizDirection
  target: QuizTarget
  order: QuizOrder
}

export interface QuizItem {
  /** 4桁ゼロ埋め熟語番号 e.g. "0001" */
  number: string
  /** 教材ID（補足データ取得用） */
  bookId?: BookId
  idiomData: IdiomData
  /** 出題形式 */
  mode: QuizMode
  /** 出題方向 */
  direction: QuizDirection
  /** 出題テキスト e.g. "a piece of ~ (1)" */
  questionText: string
  /** idioms 配列のインデックス（複数熟語対応） */
  idiomIndex: number
  /** 例文出題時の means インデックス */
  meanIndex?: number
  /** 例文穴埋め用データ */
  cloze?: ClozeData
}

export interface QuizSession {
  settings: QuizSettings
  items: QuizItem[]
  currentIndex: number
  /** QuizItem インデックス → 正解(true)/不正解(false) */
  results: Record<number, boolean>
  /** セッション種別（未定義時は 'quiz' 扱い） */
  sessionType?: 'quiz' | 'dictation' | 'typing-race'
  /** タイピングレースの制限時間（秒） */
  timeLimitSeconds?: number
  /** タイピングレースの終了予定時刻（UNIX ms） */
  endsAt?: number
  /** タイピングレースの文字数統計 */
  typingRaceStats?: {
    correctChars: number
    mistypedChars: number
  }
}
