import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGitHubData, formatNumber } from '../useGitHubData'

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
  })

  describe('fetchIdiomData', () => {
    it('JSONデータを取得してパースできる', async () => {
      const mockData = {
        idioms: ['a piece of ~'],
        means: [{ 'idiom-jp': '１つの～', 'example-sentence': 'example', 'sentence-jp': '例文訳' }],
        notes: ['補足説明'],
      }
      mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(JSON.stringify(mockData)) })

      const { fetchIdiomData } = useGitHubData()
      const data = await fetchIdiomData('0001')

      expect(data.idioms).toEqual(['a piece of ~'])
      expect(data.means[0]['idiom-jp']).toBe('１つの～')
    })

    it('取得失敗時にエラーをスローする', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })

      const { fetchIdiomData } = useGitHubData()
      await expect(fetchIdiomData('9999')).rejects.toThrow()
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
      const files = await listFiles('target')

      expect(files).toEqual(['0001.json', '0002.json'])
    })
  })

  describe('fetchSupplements', () => {
    it('補足Markdown内の相対画像パスをRaw URLに変換してHTML化する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('![bar foo](../img/bar-foo.jpeg)\n\n![baz](./img/baz.png)'),
      })

      const { fetchSupplements } = useGitHubData()
      const htmlList = await fetchSupplements('0001', ['0001-image.md', '0002-image.md'])

      expect(htmlList).toHaveLength(1)
      expect(htmlList[0]).toContain(
        'src="https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/img/bar-foo.jpeg"',
      )
      expect(htmlList[0]).toContain(
        'src="https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/img/baz.png"',
      )
    })
  })
})
