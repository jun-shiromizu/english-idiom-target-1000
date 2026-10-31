import type { Page } from '@playwright/test'

export const CLASSIC_LIST_URL =
  'https://api.github.com/repos/jun-shiromizu/english-idiom-target-1000-data/contents/classic-japanese-330/target'
export const CLASSIC_RAW_BASE =
  'https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/classic-japanese-330/target'

export type ClassicExampleFixture = { text: string; translation: string }
export type ClassicMeanFixture = { senseNumber: number; meaning: string; examples: ClassicExampleFixture[] }
export type ClassicWordFixture = {
  number: string
  words: string[]
  means: ClassicMeanFixture[]
  points: string[]
  sourcePages: { bookPage: number; image: string }[]
}

/** テスト専用の架空データ。書籍の本文は使わない */
export function makeClassicWord(number: string, overrides: Partial<ClassicWordFixture> = {}): ClassicWordFixture {
  return {
    number,
    words: [`ためし${number}`],
    means: [
      {
        senseNumber: 1,
        meaning: `試しの意味${number}`,
        examples: [{ text: `ためし${number}を言ふ。`, translation: `試しの意味${number}を言う。` }],
      },
    ],
    points: [],
    sourcePages: [{ bookPage: 10, image: '1010.jpg' }],
    ...overrides,
  }
}

/** 意味2件・例文計3件・POINT・重複する出典ページを持つ架空データ */
export function makeRichClassicWord(number = '0001'): ClassicWordFixture {
  return makeClassicWord(number, {
    words: ['ためしごと'],
    means: [
      {
        senseNumber: 1,
        meaning: '試しの言葉',
        examples: [
          { text: 'ためしごとを言ふ。', translation: '試しの言葉を言う。' },
          { text: 'ためしごとぞ聞こゆる。', translation: '試しの言葉が聞こえる。' },
        ],
      },
      {
        senseNumber: 2,
        meaning: '練習用の語',
        examples: [{ text: 'ためしごとにて習ふ。', translation: '練習用の語で習う。' }],
      },
    ],
    points: ['テスト用のPOINTである。'],
    sourcePages: [
      { bookPage: 28, image: '1028.jpg' },
      { bookPage: 29, image: '1029.jpg' },
      { bookPage: 29, image: '1029-2.jpg' },
    ],
  })
}

/**
 * 古文単語330の一覧APIとRaw URLをモックする。
 * listedNumbers を省略すると bodies のキーを一覧に含める。
 * 戻り値には GitHub 宛ての全リクエストURLが記録される。
 */
export async function mockClassicData(
  page: Page,
  bodies: Record<string, unknown>,
  listedNumbers: string[] = Object.keys(bodies),
): Promise<string[]> {
  const requestedUrls: string[] = []

  await page.route('https://api.github.com/**', async (route) => {
    const url = route.request().url()
    requestedUrls.push(url)
    if (url === CLASSIC_LIST_URL) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(listedNumbers.map((number) => ({ name: `${number}.json`, type: 'file' }))),
      })
      return
    }
    await route.fulfill({ status: 404, body: 'not found' })
  })

  await page.route('https://raw.githubusercontent.com/**', async (route) => {
    const url = route.request().url()
    requestedUrls.push(url)
    const number = url.startsWith(`${CLASSIC_RAW_BASE}/`)
      ? url.slice(CLASSIC_RAW_BASE.length + 1).replace(/\.json$/, '')
      : ''
    if (number in bodies) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(bodies[number]) })
      return
    }
    await route.fulfill({ status: 404, body: 'not found' })
  })

  return requestedUrls
}

/** 見出し語ごとに1問ずつの古文単語330の session を作る（見出し語は重複しない前提） */
export function makeClassicSession(words: ClassicWordFixture[], overrides: Record<string, unknown> = {}) {
  const numbers = words.map((word) => Number(word.number))
  return {
    contentType: 'classic-japanese',
    sessionType: 'quiz',
    settings: {
      bookId: 'classic-japanese-330',
      startNumber: Math.min(...numbers),
      endNumber: Math.max(...numbers),
      mode: 'idiom',
      direction: 'classic-to-modern',
      target: 'all',
      order: 'sequential',
    },
    words: Object.fromEntries(words.map((word) => [word.number, word])),
    items: words.flatMap((word) =>
      word.words.map((headword, wordIndex) => ({
        number: word.number,
        mode: 'idiom',
        direction: 'classic-to-modern',
        questionText: headword,
        historyKey: JSON.stringify(['v1', 'classic-japanese-330', 'idiom', 'classic-to-modern', word.number, 'word', headword, 1, 0]),
        wordIndex,
      })),
    ),
    currentIndex: 0,
    results: {},
    ...overrides,
  }
}

export async function seedSession(page: Page, session: unknown) {
  await page.evaluate((value) => {
    localStorage.setItem('idiom-app-session', JSON.stringify(value))
  }, session)
}

export async function readSession(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('idiom-app-session') ?? 'null'))
}

export async function readHistory(page: Page): Promise<Record<string, boolean>> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('idiom-app-history') ?? '{}'))
}

/** トップページで古文単語330の範囲を指定して開始する */
export async function startClassicFromHome(
  page: Page,
  options: { start: string; end: string; mode?: '見出し語' | '例文' },
) {
  await page.getByRole('radio', { name: '古文単語330' }).click()
  if (options.mode) await page.getByRole('radio', { name: options.mode, exact: true }).click()
  await page.getByLabel('開始番号').fill(options.start)
  await page.getByLabel('終了番号').fill(options.end)
  await page.getByRole('button', { name: '開始' }).click()
}
