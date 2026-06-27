import { buildGitHubApiBase, buildGitHubRawBase, getBookConfig } from '@/config'
import { marked } from 'marked'
import type { BookId, IdiomData } from '@/types'

/** 並列 fetch の同時実行上限 */
const FETCH_CONCURRENCY_LIMIT = 8
const GITHUB_FETCH_RETRY_DELAYS_MS = [250, 750, 1500] as const
const TARGET_DIRECTORY_RANGE_SIZES = [500, 100] as const

/**
 * タスク配列を最大 limit 件ずつ並列実行し、結果を元の順序で返す。
 */
async function fetchWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`Concurrency limit must be an integer >= 1 (got: ${limit})`)
  }
  const results: T[] = new Array(tasks.length)
  let index = 0

  async function worker() {
    while (index < tasks.length) {
      const currentIndex = index++
      results[currentIndex] = await tasks[currentIndex]()
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker)
  await Promise.all(workers)
  return results
}

const supplementHtmlCache = new Map<string, string | null>()
const pendingSupplementRequests = new Map<string, Promise<string | null>>()
const resolvedTargetPathCache = new Map<string, string>()
const idiomDataCache = new Map<string, IdiomData>()
const GITHUB_FETCH_OPTIONS: RequestInit = {
  cache: 'no-store',
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableGitHubStatus(status: number): boolean {
  return status === 400 || status === 403 || status === 429 || status >= 500
}

async function fetchWithRetry(url: string): Promise<Response> {
  let lastResponse: Response | null = null
  let lastError: unknown = null

  for (let attempt = 0; attempt <= GITHUB_FETCH_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(url, GITHUB_FETCH_OPTIONS)
      if (response.ok || !isRetryableGitHubStatus(response.status)) {
        return response
      }

      lastResponse = response
    } catch (error) {
      lastError = error
    }

    if (attempt < GITHUB_FETCH_RETRY_DELAYS_MS.length) {
      await sleep(GITHUB_FETCH_RETRY_DELAYS_MS[attempt])
    }
  }

  if (lastResponse) {
    return lastResponse
  }

  throw lastError instanceof Error ? lastError : new Error(`GitHub fetch failed: ${url}`)
}

export function resetGitHubDataCaches(): void {
  supplementHtmlCache.clear()
  pendingSupplementRequests.clear()
  resolvedTargetPathCache.clear()
  idiomDataCache.clear()
}

function joinBookPath(bookId: BookId, path: string): string {
  const { dataPath } = getBookConfig(bookId)
  return dataPath ? `${dataPath}/${path}` : path
}

function makeCacheKey(bookId: BookId, number: string): string {
  return `${bookId}:${number}`
}

function decodeBase64Utf8(encoded: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(encoded, 'base64').toString('utf-8')
  }

  const binary = atob(encoded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function getGitHubErrorStatus(error: unknown): number | null {
  if (!(error instanceof Error)) {
    return null
  }

  const matched = error.message.match(/\berror:\s*(\d{3})\b/i)
  return matched ? Number(matched[1]) : null
}

function buildRangeDirectory(number: number, size: number, maxNumber: number): string {
  const start = Math.floor((number - 1) / size) * size + 1
  const end = Math.min(start + size - 1, maxNumber)
  return `${formatNumber(start)}-${formatNumber(end)}`
}

function getTargetJsonPathCandidates(bookId: BookId, number: string): string[] {
  const parsedNumber = Number.parseInt(number, 10)
  if (!Number.isInteger(parsedNumber) || parsedNumber <= 0) {
    return [`target/${number}.json`]
  }

  const { maxNumber } = getBookConfig(bookId)
  const candidates = new Set<string>([`target/${number}.json`])

  for (const rangeSize of TARGET_DIRECTORY_RANGE_SIZES) {
    const directory = buildRangeDirectory(parsedNumber, rangeSize, maxNumber)
    candidates.add(`target/${directory}/${number}.json`)
  }

  return [...candidates]
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
    const res = await fetchWithRetry(`${apiBase}/${bookPath}`)
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${path}`)
    const items: Array<{ name: string; type: string }> = await res.json()
    return items.filter((i) => i.type === 'file').map((i) => i.name)
  }

  function cacheResolvedTarget(bookId: BookId, number: string, path: string, data: IdiomData): IdiomData {
    const cacheKey = makeCacheKey(bookId, number)
    resolvedTargetPathCache.set(cacheKey, path)
    idiomDataCache.set(cacheKey, data)
    return data
  }

  async function resolveTargetJsonPath(bookId: BookId, number: string): Promise<string> {
    const cacheKey = makeCacheKey(bookId, number)
    const cachedPath = resolvedTargetPathCache.get(cacheKey)
    if (cachedPath) {
      return cachedPath
    }

    for (const candidatePath of getTargetJsonPathCandidates(bookId, number)) {
      const rawResponse = await fetchRawResponse(bookId, candidatePath)

      if (rawResponse.ok) {
        const data = JSON.parse(await rawResponse.text()) as IdiomData
        cacheResolvedTarget(bookId, number, candidatePath, data)
        return candidatePath
      }

      if (rawResponse.status === 400) {
        try {
          const text = await fetchFileTextViaContentsApi(bookId, candidatePath)
          cacheResolvedTarget(bookId, number, candidatePath, JSON.parse(text) as IdiomData)
          return candidatePath
        } catch (error) {
          const status = getGitHubErrorStatus(error)
          if (status === 404 || status === 400 || status === 403 || status === 429) {
            continue
          }

          throw error
        }
      }

      if (rawResponse.status === 403 || rawResponse.status === 404) {
        continue
      }

      throw new Error(`GitHub Raw URL error: ${rawResponse.status} ${candidatePath}`)
    }

    throw new Error(`Target file not found: ${number}.json`)
  }

  /** Raw URL でファイルのテキスト内容を取得 */
  async function fetchRaw(bookId: BookId, path: string): Promise<string> {
    const rawBase = buildGitHubRawBase(bookId)
    const bookPath = joinBookPath(bookId, path)
    const res = await fetchWithRetry(`${rawBase}/${bookPath}`)
    if (!res.ok) throw new Error(`GitHub Raw URL error: ${res.status} ${path}`)
    return res.text()
  }

  async function fetchRawResponse(bookId: BookId, path: string): Promise<Response> {
    const rawBase = buildGitHubRawBase(bookId)
    const bookPath = joinBookPath(bookId, path)
    return fetchWithRetry(`${rawBase}/${bookPath}`)
  }

  async function fetchFileTextViaContentsApi(bookId: BookId, path: string): Promise<string> {
    const apiBase = buildGitHubApiBase(bookId)
    const bookPath = joinBookPath(bookId, path)
    const res = await fetchWithRetry(`${apiBase}/${bookPath}`)
    if (!res.ok) throw new Error(`GitHub API file error: ${res.status} ${path}`)

    const payload = await res.json() as { content?: string; encoding?: string }
    if (!payload.content || payload.encoding !== 'base64') {
      throw new Error(`GitHub API file payload error: ${path}`)
    }

    return decodeBase64Utf8(payload.content.replace(/\n/g, ''))
  }

  /** 指定番号の IdiomData を取得 */
  async function fetchIdiomData(bookId: BookId, number: string): Promise<IdiomData> {
    const cacheKey = makeCacheKey(bookId, number)
    const cachedData = idiomDataCache.get(cacheKey)
    if (cachedData) {
      return cachedData
    }

    const targetPath = await resolveTargetJsonPath(bookId, number)
    const resolvedData = idiomDataCache.get(cacheKey)
    if (resolvedData) {
      return resolvedData
    }

    try {
      const data = JSON.parse(await fetchRaw(bookId, targetPath)) as IdiomData
      return cacheResolvedTarget(bookId, number, targetPath, data)
    } catch (error) {
      console.warn(`Falling back to GitHub Contents API for ${targetPath}`, error)
      const data = JSON.parse(await fetchFileTextViaContentsApi(bookId, targetPath)) as IdiomData
      return cacheResolvedTarget(bookId, number, targetPath, data)
    }
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
      const res = await fetchWithRetry(`${rawBase}/${path}`)

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
    // 各JSONを同時実行数を制限して取得（大量件数でもレート制限エラーを防ぐ）
    const entries = await fetchWithConcurrencyLimit(
      Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => formatNumber(start + index)).map((num) => async () => {
        try {
          const data = await fetchIdiomData(bookId, num)
          return [num, data] as [string, IdiomData]
        } catch (error) {
          if (error instanceof Error && error.message === `Target file not found: ${num}.json`) {
            return null
          }

          throw error
        }
      }),
      FETCH_CONCURRENCY_LIMIT,
    )

    return {
      dataMap: new Map(entries.filter((entry): entry is [string, IdiomData] => entry !== null)),
    }
  }

  return { listFiles, fetchRaw, fetchIdiomData, fetchSupplementHtml, fetchRangeData, formatNumber }
}
