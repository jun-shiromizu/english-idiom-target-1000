import type { BookId } from '@/types'

export const GITHUB_OWNER = 'jun-shiromizu'

export interface BookConfig {
	id: BookId
	title: string
	shortLabel: string
	maxNumber: number
	dataRepo: string
	dataBranch: string
	dataPath: string
}

export const BOOKS: Record<BookId, BookConfig> = {
	'idiom-target-1000': {
		id: 'idiom-target-1000',
		title: '英熟語ターゲット1000',
		shortLabel: '熟語',
		maxNumber: 1000,
		dataRepo: 'english-idiom-target-1000-data',
		dataBranch: 'main',
		dataPath: 'idiom-target-1000',
	},
	'word-target-1900': {
		id: 'word-target-1900',
		title: '英単語ターゲット1900',
		shortLabel: '単語',
		maxNumber: 1900,
		dataRepo: 'english-idiom-target-1000-data',
		dataBranch: 'main',
		dataPath: 'word-target-1900',
	},
}

export const DEFAULT_BOOK_ID: BookId = 'word-target-1900'
export const BOOK_ORDER: BookId[] = ['word-target-1900', 'idiom-target-1000']
export const LEGACY_BOOK_ID: BookId = 'idiom-target-1000'

export function getBookConfig(bookId: BookId): BookConfig {
	return BOOKS[bookId]
}

export function buildGitHubApiBase(bookId: BookId): string {
	const book = getBookConfig(bookId)
	return `https://api.github.com/repos/${GITHUB_OWNER}/${book.dataRepo}/contents`
}

export function buildGitHubRawBase(bookId: BookId): string {
	const book = getBookConfig(bookId)
	return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${book.dataRepo}/${book.dataBranch}`
}

export const STORAGE_KEY_HISTORY = 'idiom-app-history'
export const STORAGE_KEY_SESSION = 'idiom-app-session'
