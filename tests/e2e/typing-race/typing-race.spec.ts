import { test, expect } from '@playwright/test'

const typingRaceData = {
  idioms: ['look forward to'],
  means: [
    {
      'idiom-jp': 'を楽しみに待つ',
      'example-sentence': 'I am looking forward to hearing from you.',
      'sentence-jp': 'あなたからの連絡を楽しみにしています。',
    },
  ],
  notes: [],
}

async function mockTypingRaceRequests(
  page: Parameters<typeof test.beforeEach>[0] extends (args: infer T) => any ? T['page'] : never,
) {
  await page.route('https://api.github.com/**', async (route) => {
    const url = route.request().url()

    if (url === 'https://api.github.com/repos/jun-shiromizu/english-idiom-target-1000-data/contents/word-target-1900/target') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ name: '0001.json', type: 'file' }]),
      })
      return
    }

    await route.fulfill({ status: 404, body: 'not found' })
  })

  await page.route('https://raw.githubusercontent.com/**', async (route) => {
    const url = route.request().url()

    if (url === 'https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/word-target-1900/target/0001.json') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(typingRaceData),
      })
      return
    }

    await route.fulfill({ status: 404, body: 'not found' })
  })
}

async function seedTypingRaceSession(
  page: Parameters<typeof test.beforeEach>[0] extends (args: infer T) => any ? T['page'] : never,
  endsAt: number,
) {
  await page.evaluate(
    ({ endsAt, item }) => {
      localStorage.setItem(
        'idiom-app-session',
        JSON.stringify({
          settings: {
            bookId: 'word-target-1900',
            startNumber: 1,
            endNumber: 1,
            mode: 'sentence',
            direction: 'en-to-ja',
            target: 'all',
            order: 'sequential',
          },
          items: [item],
          currentIndex: 0,
          results: {},
          sessionType: 'typing-race',
          timeLimitSeconds: 60,
          endsAt,
        }),
      )
    },
    {
      endsAt,
      item: {
        number: '0001',
        idiomData: typingRaceData,
        mode: 'sentence',
        direction: 'en-to-ja',
        questionText: 'I am looking forward to hearing from you.',
        idiomIndex: 0,
        meanIndex: 0,
      },
    },
  )
}

test.describe('タイピングレース', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('TYPING-001: 例文モードでタイピングレースを開始すると専用画面へ遷移する', async ({ page }) => {
    await mockTypingRaceRequests(page)

    await page.getByRole('combobox', { name: '出題形式' }).press('ArrowDown')
    await page.getByRole('option', { name: '例文' }).click()
    await page.getByLabel('開始番号').fill('1')
    await page.getByLabel('終了番号').fill('1')
    await page.getByRole('button', { name: 'タイピングレース' }).click()

    await expect(page).toHaveURL(/#\/typing-race/)
    await expect(page.getByText('あなたからの連絡を楽しみにしています。')).toBeVisible()
    await expect(page.getByText('I am looking forward to hearing from you.')).toBeVisible()
    await expect(page.getByText(/残り 60 秒/)).toBeVisible()
  })

  test('TYPING-002: 正しい例文を入力して送信すると結果が表示される', async ({ page }) => {
    await seedTypingRaceSession(page, Date.now() + 60_000)
    await page.goto('./#/typing-race')

    await page.getByLabel('例文を入力').fill('I am looking forward to hearing from you.')
    await page.getByRole('button', { name: '採点して次へ' }).click()

    await expect(page.getByRole('heading', { name: '60秒チャレンジ結果' })).toBeVisible()
    await expect(page.getByText('1 文に挑戦 / 正答率 100%')).toBeVisible()
  })

  test('TYPING-003: 誤った文字をタイプしても入力欄に反映されない', async ({ page }) => {
    await seedTypingRaceSession(page, Date.now() + 60_000)
    await page.goto('./#/typing-race')

    const input = page.getByLabel('例文を入力')
    await input.fill('I')
    await expect(input).toHaveValue('I')

    await input.type('x')
    await expect(input).toHaveValue('I')
  })

  test('TYPING-101: typing-race 以外の session で /typing-race にアクセスするとトップへ戻る', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        'idiom-app-session',
        JSON.stringify({
          settings: {
            bookId: 'word-target-1900',
            startNumber: 1,
            endNumber: 1,
            mode: 'sentence',
            direction: 'en-to-ja',
            target: 'all',
            order: 'sequential',
          },
          items: [],
          currentIndex: 0,
          results: {},
          sessionType: 'quiz',
        }),
      )
    })

    await page.goto('./#/typing-race')

    await expect(page).toHaveURL(/#\/$/)
  })
})
