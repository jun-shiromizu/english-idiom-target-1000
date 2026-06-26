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
export type BattleSessionStatus = 'deck-building' | 'dungeon-select' | 'in-battle' | 'cleared' | 'defeated'

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
  sessionType?: 'quiz' | 'dictation' | 'cloze' | 'typing-race'
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

export type BattleEffectType =
  | 'atk-multiplier'
  | 'hp-multiplier'
  | 'game-difficulty'
  | 'heal'
  | 'damage-cut'
  | 'skill-boost'

export interface BattleSkillEffect {
  effectType: BattleEffectType
  value: number | string
  durationTurns?: number
}

export interface BattleLeaderSkill {
  id: string
  name: string
  effects: BattleSkillEffect[]
  description: string
}

export interface BattleActiveSkill {
  id: string
  name: string
  effects: BattleSkillEffect[]
  cooldownTurns: number
  description: string
}

export interface BattleCharacter {
  id: string
  name: string
  icon: string
  rarity?: string
  atk: number
  hp: number
  leaderSkill: BattleLeaderSkill
  activeSkill: BattleActiveSkill
}

export interface BattleEnemy {
  id: string
  name: string
  icon?: string
  atk: number
  hp: number
  rewardScore?: number
}

export interface BattleDungeon {
  id: string
  name: string
  description?: string
  enemies: BattleEnemy[]
}

export interface BattleDeck {
  leaderId: string
  memberIds: string[]
}

export interface BattlePartyMemberState {
  characterId: string
  currentHp: number
  skillCooldownRemaining: number
}

export interface BattleEffectState {
  sourceId: string
  effectType: BattleEffectType
  value: number | string
  remainingTurns: number
}

export interface BattleSession {
  sessionType: 'battle'
  status: BattleSessionStatus
  deck: BattleDeck
  dungeonId?: string
  currentWaveIndex: number
  turn: number
  score: number
  party: BattlePartyMemberState[]
  enemyCurrentHp: number
  activeEffects: BattleEffectState[]
  pendingSkillCharacterId?: string
  lastFallingGameScore?: number
  lastIncorrectReview?: {
    question: string
    answer: string
  }
}
