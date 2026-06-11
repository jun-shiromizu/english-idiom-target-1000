import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGitHubData, formatNumber, resetGitHubDataCaches } from '../useGitHubData'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('formatNumber', () => {
  it('1 → "0001"', () => expect(formatNumber(1)).toBe('0001'))
  it('100 → "0100"', () => expect(formatNumber(100)).toBe('0100'))
  it('1000 → "1000"', () => expect(formatNumber(1000)).toBe('1000'))
})

describe('useGitHubData', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    resetGitHubDataCaches()
  })

  describe('fetchIdiomData', () => {
    it('JSONデータを取得してパースできる', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ name: '0001.json', type: 'file' }]),
        })
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(JSON.stringify({
          idioms: ['a piece of ~'],
          means: [{ 'idiom-jp': '１つの～', 'example-sentence': 'example', 'sentence-jp': '例文訳' }],
          notes: ['補足説明'],
        })) })

      const { fetchIdiomData } = useGitHubData()
      const data = await fetchIdiomData('idiom-target-1000', '0001')

      expect(data.idioms).toEqual(['a piece of ~'])
      expect(data.means[0]['idiom-jp']).toBe('１つの～')
    })

    it('target 配下がサブディレクトリでもJSONデータを取得できる', async () => {
      const mockData = {
        idioms: ['a piece of ~'],
        means: [{ 'idiom-jp': '１つの～', 'example-sentence': 'example', 'sentence-jp': '例文訳' }],
        notes: ['補足説明'],
      }
      mockFetch.mockImplementation(async (url: string) => {
        if (url.endsWith('/contents/idiom-target-1000/target')) {
          return {
            ok: true,
            json: () => Promise.resolve([{ name: '0001-0100', type: 'dir' }]),
          }
        }

        if (url.endsWith('/contents/idiom-target-1000/target/0001-0100')) {
          return {
            ok: true,
            json: () => Promise.resolve([{ name: '0001.json', type: 'file' }]),
          }
        }

        if (url.endsWith('/idiom-target-1000/target/0001-0100/0001.json')) {
          return {
            ok: true,
            text: () => Promise.resolve(JSON.stringify(mockData)),
          }
        }

        throw new Error(`Unexpected fetch URL: ${url}`)
      })

      const { fetchIdiomData } = useGitHubData()
      const data = await fetchIdiomData('idiom-target-1000', '0001')

      expect(data.idioms).toEqual(['a piece of ~'])
      expect(data.means[0]['idiom-jp']).toBe('１つの～')
      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        'https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/idiom-target-1000/target/0001-0100/0001.json',
      )
    })

    it('取得失敗時にエラーをスローする', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })

      const { fetchIdiomData } = useGitHubData()
      await expect(fetchIdiomData('idiom-target-1000', '9999')).rejects.toThrow()
    })
  })

  describe('listFiles', () => {
    it('ファイル名の配列を返す', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { name: '0001.json', type: 'file' },
          { name: '0002.json', type: 'file' },
          { name: 'somedir', type: 'dir' },
        ]),
      })

      const { listFiles } = useGitHubData()
      const files = await listFiles('idiom-target-1000', 'target')

      expect(files).toEqual(['0001.json', '0002.json'])
    })
  })

  describe('fetchRangeData', () => {
    it('target 配下のサブディレクトリもたどって範囲データを取得できる', async () => {
      const mockData1 = {
        idioms: ['first'],
        means: [{ 'idiom-jp': '最初', 'example-sentence': 'first sentence', 'sentence-jp': '最初の文' }],
        notes: [],
      }
      const mockData2 = {
        idioms: ['second'],
        means: [{ 'idiom-jp': '二番目', 'example-sentence': 'second sentence', 'sentence-jp': '二番目の文' }],
        notes: [],
      }

      mockFetch.mockImplementation(async (url: string) => {
        if (url.endsWith('/contents/idiom-target-1000/target')) {
          return {
            ok: true,
            json: () => Promise.resolve([
              { name: '0001-0100', type: 'dir' },
              { name: '0101-0200', type: 'dir' },
            ]),
          }
        }

        if (url.endsWith('/contents/idiom-target-1000/target/0001-0100')) {
          return {
            ok: true,
            json: () => Promise.resolve([
              { name: '0001.json', type: 'file' },
              { name: '0002.json', type: 'file' },
            ]),
          }
        }

        if (url.endsWith('/contents/idiom-target-1000/target/0101-0200')) {
          return {
            ok: true,
            json: () => Promise.resolve([{ name: '0101.json', type: 'file' }]),
          }
        }

        if (url.endsWith('/idiom-target-1000/target/0001-0100/0001.json')) {
          return {
            ok: true,
            text: () => Promise.resolve(JSON.stringify(mockData1)),
          }
        }

        if (url.endsWith('/idiom-target-1000/target/0001-0100/0002.json')) {
          return {
            ok: true,
            text: () => Promise.resolve(JSON.stringify(mockData2)),
          }
        }

        throw new Error(`Unexpected fetch URL: ${url}`)
      })

      const { fetchRangeData } = useGitHubData()
      const { dataMap } = await fetchRangeData('idiom-target-1000', 1, 2)

      expect([...dataMap.keys()]).toEqual(['0001', '0002'])
      expect(dataMap.get('0001')?.idioms).toEqual(['first'])
      expect(dataMap.get('0002')?.idioms).toEqual(['second'])
    })

    // リグレッションテスト: Issue #65 大量件数で同時実行数が上限以下に抑えられ、かつ全データを取得できる
    it('同時実行上限（20件）を超える件数でも全データを正常に取得でき、同時実行数が上限以下に抑えられる', async () => {
      const LIMIT = 20
      const count = 25
      const fileNames = Array.from({ length: count }, (_, i) => `${String(i + 1).padStart(4, '0')}.json`)
      const mockJsonData = {
        idioms: ['test'],
        means: [{ 'idiom-jp': 'テスト', 'example-sentence': 'ex', 'sentence-jp': '例' }],
        notes: [],
      }

      let currentInflight = 0
      let maxInflight = 0
      const pendingResolves: (() => void)[] = []

      mockFetch.mockImplementation(async (url: string) => {
        if (url.endsWith('/contents/idiom-target-1000/target')) {
          return { ok: true, json: () => Promise.resolve([{ name: '0001-0100', type: 'dir' }]) }
        }

        if (url.endsWith('/contents/idiom-target-1000/target/0001-0100')) {
          return {
            ok: true,
            json: () => Promise.resolve(fileNames.map((name) => ({ name, type: 'file' }))),
          }
        }

        if (fileNames.some((name) => url.endsWith(`/target/0001-0100/${name}`))) {
          currentInflight++
          maxInflight = Math.max(maxInflight, currentInflight)
          await new Promise<void>((resolve) => pendingResolves.push(resolve))
          currentInflight--
          return { ok: true, text: () => Promise.resolve(JSON.stringify(mockJsonData)) }
        }

        throw new Error(`Unexpected fetch URL: ${url}`)
      })

      const { fetchRangeData } = useGitHubData()
      const fetchPromise = fetchRangeData('idiom-target-1000', 1, count)

      // macrotask まで進め、全ワーカーが最初のリクエストを開始するのを待つ
      await new Promise<void>((resolve) => setTimeout(resolve, 0))

      // 保留中のリクエストをすべて解決し、残りのリクエストが完了するまで繰り返す
      while (pendingResolves.length > 0) {
        pendingResolves.splice(0).forEach((r) => r())
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
      }

      const { dataMap } = await fetchPromise

      expect(dataMap.size).toBe(count)
      expect(maxInflight).toBeLessThanOrEqual(LIMIT)
    })
  })

  describe('fetchSupplementHtml', () => {
    it('固定ファイル名の補足Markdownを取得し、相対画像パスをRaw URLに変換してHTML化する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('![bar foo](../img/bar-foo.jpeg)\n\n![baz](./img/baz.png)'),
      })

      const { fetchSupplementHtml } = useGitHubData()
      const html = await fetchSupplementHtml('idiom-target-1000', '0001')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/idiom-target-1000/supplement/0001-add.md',
      )
      expect(html).toContain(
        'src="https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/idiom-target-1000/img/bar-foo.jpeg"',
      )
      expect(html).toContain(
        'src="https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/idiom-target-1000/img/baz.png"',
      )
    })

    it('補足Markdownが存在しない場合は null を返す', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })

      const { fetchSupplementHtml } = useGitHubData()
      await expect(fetchSupplementHtml('idiom-target-1000', '0999')).resolves.toBeNull()
    })

    it('教材ごとの dataPath を使って単語データの補足を取得する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('![word](./img/word.png)'),
      })

      const { fetchSupplementHtml } = useGitHubData()
      const html = await fetchSupplementHtml('word-target-1900', '0001')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/word-target-1900/supplement/0001-add.md',
      )
      expect(html).toContain(
        'src="https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/word-target-1900/img/word.png"',
      )
    })
  })
})
