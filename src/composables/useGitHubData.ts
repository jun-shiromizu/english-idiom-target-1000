import { GITHUB_API_BASE, GITHUB_RAW_BASE } from '@/config'
import { marked } from 'marked'
import type { IdiomData } from '@/types'

const supplementHtmlCache = new Map<string, string | null>()
const pendingSupplementRequests = new Map<string, Promise<string | null>>()

/** 数値を4桁ゼロ埋め文字列に変換 */
export function formatNumber(n: number): string {
  return String(n).padStart(4, '0')
}

/** 補足Markdown内の相対画像パスをGitHub Raw URLに変換 */
function resolveImagePaths(markdown: string): string {
  return markdown.replace(
    /!\[([^\]]*)\]\((?:\.{1,2}\/)?img\/([^)]+)\)/g,
    (_, alt, filename) => `![${alt}](${GITHUB_RAW_BASE}/img/${filename})`,
  )
}

export function useGitHubData() {
  /** GitHub Contents API でディレクトリ内のファイル名一覧を取得 */
  async function listFiles(path: string): Promise<string[]> {
    const res = await fetch(`${GITHUB_API_BASE}/${path}`)
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${path}`)
    const items: Array<{ name: string; type: string }> = await res.json()
    return items.filter((i) => i.type === 'file').map((i) => i.name)
  }

  /** Raw URL でファイルのテキスト内容を取得 */
  async function fetchRaw(path: string): Promise<string> {
    const res = await fetch(`${GITHUB_RAW_BASE}/${path}`)
    if (!res.ok) throw new Error(`GitHub Raw URL error: ${res.status} ${path}`)
    return res.text()
  }

  /** 指定番号の IdiomData を取得 */
  async function fetchIdiomData(number: string): Promise<IdiomData> {
    const text = await fetchRaw(`target/${number}.json`)
    return JSON.parse(text) as IdiomData
  }

  /** 指定番号の補足Markdownを取得しHTMLに変換して返す。補足は supplement/{number}-add.md 固定。 */
  async function fetchSupplementHtml(number: string): Promise<string | null> {
    if (supplementHtmlCache.has(number)) {
      return supplementHtmlCache.get(number) ?? null
    }

    const pending = pendingSupplementRequests.get(number)
    if (pending) return pending

    const request = (async () => {
      const path = `supplement/${number}-add.md`
      const res = await fetch(`${GITHUB_RAW_BASE}/${path}`)

      if (res.status === 404) {
        supplementHtmlCache.set(number, null)
        return null
      }

      if (!res.ok) throw new Error(`GitHub Raw URL error: ${res.status} ${path}`)

      const raw = await res.text()
      const resolved = resolveImagePaths(raw)
      const html = await marked.parse(resolved)
      supplementHtmlCache.set(number, html)
      return html
    })()

    pendingSupplementRequests.set(number, request)
    try {
      return await request
    } finally {
      pendingSupplementRequests.delete(number)
    }
  }

  /**
   * 指定範囲の全IdiomDataを取得する。
   */
  async function fetchRangeData(
    start: number,
    end: number,
  ): Promise<{ dataMap: Map<string, IdiomData> }> {
    const targetFiles = await listFiles('target')

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
        const data = await fetchIdiomData(num)
        return [num, data] as [string, IdiomData]
      }),
    )

    return { dataMap: new Map(entries) }
  }

  return { listFiles, fetchRaw, fetchIdiomData, fetchSupplementHtml, fetchRangeData, formatNumber }
}
