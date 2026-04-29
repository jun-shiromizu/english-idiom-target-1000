export interface IdiomData {
  idioms: string[]
  means: Mean[]
  notes: string[]
}

export interface Mean {
  'idiom-jp': string
  synonyms?: string[]
  'example-sentence': string
  'sentence-jp': string
}

export type QuizMode = 'idiom' | 'sentence'
export type QuizTarget = 'all' | 'incorrect'
export type QuizOrder = 'sequential' | 'random'

export interface QuizSettings {
  startNumber: number
  endNumber: number
  mode: QuizMode
  target: QuizTarget
  order: QuizOrder
}

export interface QuizItem {
  /** 4桁ゼロ埋め熟語番号 e.g. "0001" */
  number: string
  idiomData: IdiomData
  /** 出題テキスト e.g. "a piece of ~ (1)" */
  questionText: string
  /** idioms 配列のインデックス（複数熟語対応） */
  idiomIndex: number
  /** 例文出題時の means インデックス */
  meanIndex?: number
  /** 補足Markdownを変換したHTML文字列の配列 */
  supplementHtml: string[]
}

export interface QuizSession {
  settings: QuizSettings
  items: QuizItem[]
  currentIndex: number
  /** QuizItem インデックス → 正解(true)/不正解(false) */
  results: Record<number, boolean>
}
