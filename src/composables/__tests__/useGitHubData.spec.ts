import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGitHubData, formatNumber, resetGitHubDataCaches } from '../useGitHubData'
import { ClassicDataError } from '@/utils/classicWordData'
import { makeClassicWord } from '@/__tests__/fixtures/classicWords'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function hasHost(url: string, host: string): boolean {
  try {
    return new URL(url).hostname === host
  } catch {
    return false
  }
}

function hasPathSuffix(url: string, suffix: string): boolean {
  try {
    return new URL(url).pathname.endsWith(suffix)
  } catch {
    return false
  }
}

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
      const mockData = {
        idioms: ['a piece of ~'],
        means: [{ 'idiom-jp': '１つの～', 'example-sentence': 'example', 'sentence-jp': '例文訳' }],
        notes: ['補足説明'],
      }

      mockFetch.mockImplementation(async (url: string) => {
        if (hasPathSuffix(url, '/idiom-target-1000/target/0001.json')) {
          return { ok: false, status: 404 }
        }

        if (hasPathSuffix(url, '/contents/idiom-target-1000/target/0001.json')) {
          return { ok: false, status: 404 }
        }

        if (hasPathSuffix(url, '/contents/idiom-target-1000/target/0001-0500/0001.json')) {
          return {
            ok: true,
            json: () => Promise.resolve({
              encoding: 'base64',
              content: encodeBase64Utf8(JSON.stringify(mockData)),
            }),
          }
        }

        if (hasPathSuffix(url, '/idiom-target-1000/target/0001-0500/0001.json')) {
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
    })

    it('候補パスの最初が 403 でも次のレンジ候補からJSONデータを取得できる', async () => {
      const mockData = {
        idioms: ['a piece of ~'],
        means: [{ 'idiom-jp': '１つの～', 'example-sentence': 'example', 'sentence-jp': '例文訳' }],
        notes: ['補足説明'],
      }

      mockFetch.mockImplementation(async (url: string) => {
        if (hasPathSuffix(url, '/idiom-target-1000/target/0001.json')) {
          return { ok: false, status: 403 }
        }

        if (hasPathSuffix(url, '/contents/idiom-target-1000/target/0001-0500/0001.json')) {
          return {
            ok: true,
            json: () => Promise.resolve({
              encoding: 'base64',
              content: encodeBase64Utf8(JSON.stringify(mockData)),
            }),
          }
        }

        if (hasPathSuffix(url, '/idiom-target-1000/target/0001-0500/0001.json')) {
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
    })

    it('取得失敗時にエラーをスローする', async () => {
      mockFetch.mockImplementation(async () => ({ ok: false, status: 404 }))

      const { fetchIdiomData } = useGitHubData()
      await expect(fetchIdiomData('idiom-target-1000', '9999')).rejects.toThrow()
    })

    it('一時的な 400 エラーの後に再試行で取得できる', async () => {
      vi.useFakeTimers()
      const mockData = {
        idioms: ['recover'],
        means: [{ 'idiom-jp': '回復', 'example-sentence': 'recover', 'sentence-jp': '回復する' }],
        notes: [],
      }

      mockFetch.mockImplementation(async (url: string) => {
        if (hasPathSuffix(url, '/idiom-target-1000/target/0150.json')) {
          return { ok: false, status: 404 }
        }

        if (hasPathSuffix(url, '/idiom-target-1000/target/0001-0500/0150.json')) {
          return mockFetch.mock.calls.filter(([calledUrl]) => calledUrl === url).length === 1
            ? { ok: false, status: 400 }
            : { ok: true, text: () => Promise.resolve(JSON.stringify(mockData)) }
        }

        throw new Error(`Unexpected fetch URL: ${url}`)
      })

      const { fetchIdiomData } = useGitHubData()
      const promise = fetchIdiomData('idiom-target-1000', '0150')

      await vi.runAllTimersAsync()
      const data = await promise

      expect(data.idioms).toEqual(['recover'])
      expect(mockFetch).toHaveBeenCalledTimes(3)
      vi.useRealTimers()
    })

    it('Raw URL が 400 のままでも Contents API のファイル取得へフォールバックできる', async () => {
      vi.useFakeTimers()
      const mockData = {
        idioms: ['fallback'],
        means: [{ 'idiom-jp': '代替', 'example-sentence': 'fallback', 'sentence-jp': 'フォールバック' }],
        notes: [],
      }

      mockFetch.mockImplementation(async (url: string) => {
        if (hasPathSuffix(url, '/idiom-target-1000/target/0144.json')) {
          return { ok: false, status: 404 }
        }

        if (hasPathSuffix(url, '/contents/idiom-target-1000/target/0001-0500/0144.json')) {
          return {
            ok: true,
            json: () => Promise.resolve({
              encoding: 'base64',
              content: encodeBase64Utf8(JSON.stringify(mockData)),
            }),
          }
        }

        if (hasPathSuffix(url, '/idiom-target-1000/target/0001-0500/0144.json')) {
          return { ok: false, status: 400 }
        }

        throw new Error(`Unexpected fetch URL: ${url}`)
      })

      const { fetchIdiomData } = useGitHubData()
      const promise = fetchIdiomData('idiom-target-1000', '0144')
      await vi.runAllTimersAsync()
      const data = await promise

      expect(data.idioms).toEqual(['fallback'])
      vi.useRealTimers()
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
    it('レンジ候補のJSONを直接取得して範囲データを構築できる', async () => {
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
        if (hasPathSuffix(url, '/idiom-target-1000/target/0001.json') || hasPathSuffix(url, '/idiom-target-1000/target/0002.json')) {
          return { ok: false, status: 404 }
        }

        if (hasPathSuffix(url, '/idiom-target-1000/target/0001-0500/0001.json')) {
          return {
            ok: true,
            text: () => Promise.resolve(JSON.stringify(mockData1)),
          }
        }

        if (hasPathSuffix(url, '/idiom-target-1000/target/0001-0500/0002.json')) {
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

    // リグレッションテスト: Issue #65 大量件数でも同時実行数が上限以下に抑えられ、かつ全データを取得できる
    it('同時実行上限（8件）を超える件数でも全データを正常に取得でき、同時実行数が上限以下に抑えられる', async () => {
      const LIMIT = 8
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
        if (hasHost(url, 'raw.githubusercontent.com') && fileNames.some((name) => hasPathSuffix(url, `/target/${name}`))) {
          return { ok: false, status: 404 }
        }

        if (hasHost(url, 'raw.githubusercontent.com') && fileNames.some((name) => hasPathSuffix(url, `/target/0001-0500/${name}`))) {
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
        { cache: 'no-store' },
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

    it.each([
      ['0001', '0001-0500'],
      ['0501', '0501-1000'],
    ])('単語データは範囲フォルダ %s-add.md を取得する', async (number, directory) => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('![word](./img/word.png)'),
      })

      const { fetchSupplementHtml } = useGitHubData()
      const html = await fetchSupplementHtml('word-target-1900', number)

      expect(mockFetch).toHaveBeenCalledWith(
        `https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/word-target-1900/supplement/${directory}/${number}-add.md`,
        { cache: 'no-store' },
      )
      expect(html).toContain(
        'src="https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/word-target-1900/img/word.png"',
      )
    })

    it('単語の範囲フォルダに補足がない場合は従来の直下パスを試す', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('flat supplement'),
        })

      const { fetchSupplementHtml } = useGitHubData()
      const html = await fetchSupplementHtml('word-target-1900', '0001')

      expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([
        'https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/word-target-1900/supplement/0001-0500/0001-add.md',
        'https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/word-target-1900/supplement/0001-add.md',
      ])
      expect(html).toContain('flat supplement')
    })
  })

  describe('fetchClassicRangeData', () => {
    const LIST_URL =
      'https://api.github.com/repos/jun-shiromizu/english-idiom-target-1000-data/contents/classic-japanese-330/target'
    const RAW_BASE =
      'https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/classic-japanese-330/target'

    function listResponse(numbers: string[]) {
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve(numbers.map((number) => ({ name: `${number}.json`, type: 'file' }))),
      }
    }

    function rawResponse(value: unknown) {
      return { ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(value)) }
    }

    function mockClassicFetch(files: Record<string, unknown>, listed = Object.keys(files)) {
      mockFetch.mockImplementation(async (url: string) => {
        if (url === LIST_URL) return listResponse(listed)
        const number = Object.keys(files).find((key) => url === `${RAW_BASE}/${key}.json`)
        if (number) return rawResponse(files[number])
        return { ok: false, status: 404 }
      })
    }

    it('CJ-05: 一覧と本体を古文パスから取得し、画像・補足Markdownは取得しない', async () => {
      mockClassicFetch({ '0001': makeClassicWord('0001'), '0002': makeClassicWord('0002') })

      const { fetchClassicRangeData } = useGitHubData()
      const { dataMap } = await fetchClassicRangeData(1, 2)

      expect([...dataMap.keys()]).toEqual(['0001', '0002'])
      expect(dataMap.get('0002')).toEqual(makeClassicWord('0002'))
      expect(mockFetch.mock.calls.map(([url]) => url).sort()).toEqual(
        [LIST_URL, `${RAW_BASE}/0001.json`, `${RAW_BASE}/0002.json`].sort(),
      )
      expect(mockFetch).toHaveBeenCalledWith(LIST_URL, { cache: 'no-store' })
    })

    it('CJ-05: 同じ範囲を再度開始しても一覧と本体を再取得する', async () => {
      mockClassicFetch({ '0001': makeClassicWord('0001') })
      const { fetchClassicRangeData } = useGitHubData()

      await fetchClassicRangeData(1, 1)
      await fetchClassicRangeData(1, 1)

      expect(mockFetch).toHaveBeenCalledTimes(4)
    })

    it('CJ-06: 一覧にない番号をまとめて欠落として通知し、本体を取得しない', async () => {
      mockClassicFetch({ '0001': makeClassicWord('0001') })
      const { fetchClassicRangeData } = useGitHubData()

      const error = await fetchClassicRangeData(1, 3).catch((caught: unknown) => caught)

      expect(error).toBeInstanceOf(ClassicDataError)
      expect(error).toMatchObject({ kind: 'missing', numbers: ['0002', '0003'] })
      expect((error as Error).message).toContain('No.0002、No.0003')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('CJ-06: 一覧にあっても本体が404なら欠落として通知する', async () => {
      mockClassicFetch({}, ['0001'])
      const { fetchClassicRangeData } = useGitHubData()

      await expect(fetchClassicRangeData(1, 1)).rejects.toMatchObject({ kind: 'missing', numbers: ['0001'] })
    })

    it('CJ-06: 形式不正・JSON解析失敗を番号付きで通知する', async () => {
      mockClassicFetch({ '0001': { ...makeClassicWord('0001'), words: [] } })
      const { fetchClassicRangeData } = useGitHubData()

      await expect(fetchClassicRangeData(1, 1)).rejects.toMatchObject({ kind: 'invalid', numbers: ['0001'] })

      mockFetch.mockImplementation(async (url: string) =>
        url === LIST_URL ? listResponse(['0001']) : { ok: true, status: 200, text: () => Promise.resolve('{') },
      )
      await expect(fetchClassicRangeData(1, 1)).rejects.toMatchObject({
        kind: 'invalid',
        message: expect.stringContaining('JSONとして解析できません'),
      })
    })

    it('CJ-06: 一覧の取得失敗を通知する', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 })
      const { fetchClassicRangeData } = useGitHubData()

      await expect(fetchClassicRangeData(1, 1)).rejects.toMatchObject({ kind: 'list-failed' })
    })

    it('CJ-06: 本体の通信失敗をリトライ後に通知する', async () => {
      vi.useFakeTimers()
      mockFetch.mockImplementation(async (url: string) => {
        if (url === LIST_URL) return listResponse(['0001'])
        throw new TypeError('Failed to fetch')
      })
      const { fetchClassicRangeData } = useGitHubData()

      const promise = fetchClassicRangeData(1, 1).catch((caught: unknown) => caught)
      await vi.runAllTimersAsync()
      const error = await promise
      vi.useRealTimers()

      expect(error).toMatchObject({ kind: 'fetch-failed', numbers: ['0001'] })
      expect(mockFetch.mock.calls.filter(([url]) => url === `${RAW_BASE}/0001.json`).length).toBeGreaterThan(1)
    })
  })
})
