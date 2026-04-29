import { GITHUB_API_BASE, GITHUB_RAW_BASE } from '@/config'
import { marked } from 'marked'
import type { IdiomData } from '@/types'

/** 数値を4桁ゼロ埋め文字列に変換 */
export function formatNumber(n: number): string {
  return String(n).padStart(4, '0')
}

/** 補足Markdown内の相対画像パスをGitHub Raw URLに変換 */
function resolveImagePaths(markdown: string): string {
  return markdown.replace(
    /!\[([^\]]*)\]\(\.\/img\/([^)]+)\)/g,
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

  /**
   * 指定番号の補足Markdownファイルを全て取得しHTMLに変換して返す。
   * ファイル一覧はAPIで取得し、"{number}-" で始まるものを対象とする。
   */
  async function fetchSupplements(number: string, allSupplementFiles: string[]): Promise<string[]> {
    const targets = allSupplementFiles.filter((name) => name.startsWith(`${number}-`) && name.endsWith('.md'))
    if (targets.length === 0) return []

    const htmlList: string[] = []
    for (const name of targets) {
      const raw = await fetchRaw(`supplement/${name}`)
      const resolved = resolveImagePaths(raw)
      const html = await marked.parse(resolved)
      htmlList.push(html)
    }
    return htmlList
  }

  /**
   * 指定範囲の全IdiomDataを取得する。
   * 補足ファイル一覧も一括取得して返す。
   */
  async function fetchRangeData(
    start: number,
    end: number,
  ): Promise<{ dataMap: Map<string, IdiomData>; supplementFiles: string[] }> {
    // ファイル一覧取得（2回のAPI呼び出し）
    const [targetFiles, supplementFiles] = await Promise.all([
      listFiles('target'),
      listFiles('supplement').catch(() => [] as string[]),
    ])

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

    return {
      dataMap: new Map(entries),
      supplementFiles,
    }
  }

  return { listFiles, fetchRaw, fetchIdiomData, fetchSupplements, fetchRangeData, formatNumber }
}
