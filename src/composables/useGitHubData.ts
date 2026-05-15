import { buildGitHubApiBase, buildGitHubRawBase, getBookConfig } from '@/config'
import { marked } from 'marked'
import type { BookId, IdiomData } from '@/types'

const supplementHtmlCache = new Map<string, string | null>()
const pendingSupplementRequests = new Map<string, Promise<string | null>>()

function joinBookPath(bookId: BookId, path: string): string {
  const { dataPath } = getBookConfig(bookId)
  return dataPath ? `${dataPath}/${path}` : path
}

function makeCacheKey(bookId: BookId, number: string): string {
  return `${bookId}:${number}`
}

/** 数値を4桁ゼロ埋め文字列に変換 */
export function formatNumber(n: number): string {
  return String(n).padStart(4, '0')
}

/** 補足Markdown内の相対画像パスをGitHub Raw URLに変換 */
function resolveImagePaths(bookId: BookId, markdown: string): string {
  const rawBase = buildGitHubRawBase(bookId)
  const imageBasePath = joinBookPath(bookId, 'img')
  return markdown.replace(
    /!\[([^\]]*)\]\((?:\.{1,2}\/)?img\/([^)]+)\)/g,
    (_, alt, filename) => `![${alt}](${rawBase}/${imageBasePath}/${filename})`,
  )
}

export function useGitHubData() {
  /** GitHub Contents API でディレクトリ内のファイル名一覧を取得 */
  async function listFiles(bookId: BookId, path: string): Promise<string[]> {
    const apiBase = buildGitHubApiBase(bookId)
    const bookPath = joinBookPath(bookId, path)
    const res = await fetch(`${apiBase}/${bookPath}`)
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${path}`)
    const items: Array<{ name: string; type: string }> = await res.json()
    return items.filter((i) => i.type === 'file').map((i) => i.name)
  }

  /** Raw URL でファイルのテキスト内容を取得 */
  async function fetchRaw(bookId: BookId, path: string): Promise<string> {
    const rawBase = buildGitHubRawBase(bookId)
    const bookPath = joinBookPath(bookId, path)
    const res = await fetch(`${rawBase}/${bookPath}`)
    if (!res.ok) throw new Error(`GitHub Raw URL error: ${res.status} ${path}`)
    return res.text()
  }

  /** 指定番号の IdiomData を取得 */
  async function fetchIdiomData(bookId: BookId, number: string): Promise<IdiomData> {
    const text = await fetchRaw(bookId, `target/${number}.json`)
    return JSON.parse(text) as IdiomData
  }

  /** 指定番号の補足Markdownを取得しHTMLに変換して返す。補足は supplement/{number}-add.md 固定。 */
  async function fetchSupplementHtml(bookId: BookId, number: string): Promise<string | null> {
    const cacheKey = makeCacheKey(bookId, number)

    if (supplementHtmlCache.has(cacheKey)) {
      return supplementHtmlCache.get(cacheKey) ?? null
    }

    const pending = pendingSupplementRequests.get(cacheKey)
    if (pending) return pending

    const request = (async () => {
      const rawBase = buildGitHubRawBase(bookId)
      const path = joinBookPath(bookId, `supplement/${number}-add.md`)
      const res = await fetch(`${rawBase}/${path}`)

      if (res.status === 404) {
        supplementHtmlCache.set(cacheKey, null)
        return null
      }

      if (!res.ok) throw new Error(`GitHub Raw URL error: ${res.status} ${path}`)

      const raw = await res.text()
      const resolved = resolveImagePaths(bookId, raw)
      const html = await marked.parse(resolved)
      supplementHtmlCache.set(cacheKey, html)
      return html
    })()

    pendingSupplementRequests.set(cacheKey, request)
    try {
      return await request
    } finally {
      pendingSupplementRequests.delete(cacheKey)
    }
  }

  /**
   * 指定範囲の全IdiomDataを取得する。
   */
  async function fetchRangeData(
    bookId: BookId,
    start: number,
    end: number,
  ): Promise<{ dataMap: Map<string, IdiomData> }> {
    const targetFiles = await listFiles(bookId, 'target')

    // 範囲内のJSONファイルを抽出
    const numbersInRange: string[] = []
    for (let i = start; i <= end; i++) {
      const num = formatNumber(i)
      if (targetFiles.includes(`${num}.json`)) {
        numbersInRange.push(num)
      }
    }

    // 各JSONを並列取得
    const entries = await Promise.all(
      numbersInRange.map(async (num) => {
        const data = await fetchIdiomData(bookId, num)
        return [num, data] as [string, IdiomData]
      }),
    )

    return { dataMap: new Map(entries) }
  }

  return { listFiles, fetchRaw, fetchIdiomData, fetchSupplementHtml, fetchRangeData, formatNumber }
}
