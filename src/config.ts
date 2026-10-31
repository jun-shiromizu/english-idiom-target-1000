import type { BookId, BookKind, ClassicBookId, EnglishBookId, StudyAction } from '@/types'

export const GITHUB_OWNER = 'jun-shiromizu'
export const BATTLE_DATA_REPO = 'english-idiom-target-1000-data'
export const BATTLE_DATA_BRANCH = 'main'
export const BATTLE_DATA_PATH = 'battle'

export interface BookConfig {
	id: BookId
	title: string
	shortLabel: string
	kind: BookKind
	maxNumber: number
	dataRepo: string
	dataBranch: string
	dataPath: string
	/** トップ画面で選択できるアクション */
	supportedActions: StudyAction[]
}

const ALL_STUDY_ACTIONS: StudyAction[] = ['quiz', 'dictation', 'cloze', 'typing-race', 'game', 'battle']

export const BOOKS: Record<BookId, BookConfig> = {
	'idiom-target-1000': {
		id: 'idiom-target-1000',
		title: '英熟語ターゲット1000',
		shortLabel: '熟語',
		kind: 'english',
		maxNumber: 1000,
		dataRepo: 'english-idiom-target-1000-data',
		dataBranch: 'main',
		dataPath: 'idiom-target-1000',
		supportedActions: ALL_STUDY_ACTIONS,
	},
	'word-target-1900': {
		id: 'word-target-1900',
		title: '英単語ターゲット1900',
		shortLabel: '単語',
		kind: 'english',
		maxNumber: 1900,
		dataRepo: 'english-idiom-target-1000-data',
		dataBranch: 'main',
		dataPath: 'word-target-1900',
		supportedActions: ALL_STUDY_ACTIONS,
	},
	'classic-japanese-330': {
		id: 'classic-japanese-330',
		title: '古文単語330',
		shortLabel: '古文',
		kind: 'classic',
		maxNumber: 330,
		dataRepo: 'english-idiom-target-1000-data',
		dataBranch: 'main',
		dataPath: 'classic-japanese-330',
		supportedActions: ['quiz'],
	},
}

export const DEFAULT_BOOK_ID: EnglishBookId = 'word-target-1900'
export const CLASSIC_BOOK_ID: ClassicBookId = 'classic-japanese-330'
export const ENGLISH_BOOK_ORDER: EnglishBookId[] = ['word-target-1900', 'idiom-target-1000']
export const BOOK_ORDER: BookId[] = [...ENGLISH_BOOK_ORDER, CLASSIC_BOOK_ID]
export const LEGACY_BOOK_ID: EnglishBookId = 'idiom-target-1000'

export function getBookConfig(bookId: BookId): BookConfig {
	return BOOKS[bookId]
}

export function isBookId(value: unknown): value is BookId {
	return typeof value === 'string' && (BOOK_ORDER as string[]).includes(value)
}

export function isEnglishBookId(value: unknown): value is EnglishBookId {
	return typeof value === 'string' && (ENGLISH_BOOK_ORDER as string[]).includes(value)
}

export function isClassicBookId(value: unknown): value is ClassicBookId {
	return value === CLASSIC_BOOK_ID
}

export function isActionSupported(bookId: BookId, action: StudyAction): boolean {
	return getBookConfig(bookId).supportedActions.includes(action)
}

export function buildGitHubApiBase(bookId: BookId): string {
	const book = getBookConfig(bookId)
	return `https://api.github.com/repos/${GITHUB_OWNER}/${book.dataRepo}/contents`
}

export function buildGitHubRawBase(bookId: BookId): string {
	const book = getBookConfig(bookId)
	return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${book.dataRepo}/${book.dataBranch}`
}

export function buildBattleGitHubApiBase(): string {
	return `https://api.github.com/repos/${GITHUB_OWNER}/${BATTLE_DATA_REPO}/contents`
}

export function buildBattleGitHubRawBase(): string {
	return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${BATTLE_DATA_REPO}/${BATTLE_DATA_BRANCH}`
}

export const STORAGE_KEY_HISTORY = 'idiom-app-history'
export const STORAGE_KEY_SESSION = 'idiom-app-session'
export const STORAGE_KEY_BATTLE_SESSION = 'idiom-app-battle-session'
export const STORAGE_KEY_BATTLE_DECK = 'idiom-app-battle-deck'
export const STORAGE_KEY_SETTINGS = 'idiom-app-settings'
export const STORAGE_KEY_GAME_SETTINGS = 'idiom-app-game-settings'
export const STORAGE_KEY_THEME = 'idiom-app-theme'
