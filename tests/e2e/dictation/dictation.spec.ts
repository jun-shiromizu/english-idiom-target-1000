import { test, expect } from '@playwright/test'
import type { QuizSession } from '@/types'

const mockWordData = {
  idioms: ['create'],
  means: [
    {
      'idiom-jp': 'を創り出す',
      'example-sentence': 'Technological change will create new ways of living.',
      'sentence-jp': '技術の変化は新たな生活様式を創り出す。',
    },
  ],
  notes: [],
}

const mockWordData2 = {
  idioms: ['acquire'],
  means: [
    {
      'idiom-jp': 'を習得する',
      'example-sentence': 'She acquired a new skill.',
      'sentence-jp': '彼女は新しいスキルを習得した。',
    },
  ],
  notes: [],
}

async function seedDictationSession(
  page: Parameters<typeof test.beforeEach>[0] extends (args: infer T) => any ? T['page'] : never,
  items: QuizSession['items'],
) {
  // localStorage に書き込んでから /dictation に遷移する（セッション確認前に設定済みにする）
  await page.evaluate(
    ({ items }) => {
      const session = {
        settings: {
          bookId: 'word-target-1900',
          startNumber: 1,
          endNumber: items.length,
          mode: 'idiom',
          direction: 'ja-to-en',
          target: 'all',
          order: 'sequential',
        },
        items,
        currentIndex: 0,
        results: {},
        sessionType: 'dictation',
      }
      localStorage.setItem('idiom-app-session', JSON.stringify(session))
    },
    { items },
  )
  await page.goto('./#/dictation')
}

function makeItem(number: string, questionText: string, idiomData: typeof mockWordData, idiom: string) {
  return {
    number,
    idiomData,
    mode: 'idiom',
    direction: 'ja-to-en',
    questionText,
    idiomIndex: 0,
    answer: idiom,
  }
}

test.describe('書き取りモード', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('./')
  })

  test('DICTATION-001: 書き取り画面を開くと問題文と入力欄が表示される', async ({ page }) => {
    const items = [makeItem('0001', 'を創り出す', mockWordData, 'create')]
    await seedDictationSession(page, items)

    await expect(page.getByText('を創り出す')).toBeVisible()
    await expect(page.getByLabel('英単語を入力')).toBeVisible()
    await expect(page.getByRole('progressbar')).toBeVisible()
  })

  test('DICTATION-002: 正しい英単語を入力して Enter を押すと「正解」が表示される', async ({ page }) => {
    const items = [makeItem('0001', 'を創り出す', mockWordData, 'create')]
    await seedDictationSession(page, items)

    await page.getByLabel('英単語を入力').fill('create')
    await page.getByLabel('英単語を入力').press('Enter')

    await expect(page.getByText('正解')).toBeVisible()
    await expect(page.getByRole('strong').filter({ hasText: 'create' })).toBeVisible()
    // 1問のみの場合は「結果を見る」ボタン
    await expect(page.getByRole('button', { name: '結果を見る' })).toBeVisible()
  })

  test('DICTATION-003: 誤った英単語を入力して Enter を押すと「不正解」が表示される', async ({ page }) => {
    const items = [makeItem('0001', 'を創り出す', mockWordData, 'create')]
    await seedDictationSession(page, items)

    await page.getByLabel('英単語を入力').fill('creat')
    await page.getByLabel('英単語を入力').press('Enter')

    await expect(page.getByText('不正解')).toBeVisible()
    await expect(page.getByText('creat', { exact: true })).toBeVisible()
  })

  test('DICTATION-004: 「次の問題へ」を押すと次の問題が表示される', async ({ page }) => {
    const items = [
      makeItem('0001', 'を創り出す', mockWordData, 'create'),
      makeItem('0002', 'を習得する', mockWordData2, 'acquire'),
    ]
    await seedDictationSession(page, items)

    await page.getByLabel('英単語を入力').fill('create')
    await page.getByLabel('英単語を入力').press('Enter')
    await page.getByRole('button', { name: '次の問題へ' }).click()

    await expect(page.getByText('を習得する')).toBeVisible()
    await expect(page.getByLabel('英単語を入力')).toHaveValue('')
  })

  test('DICTATION-005: 最後の問題に回答すると「結果を見る」ボタンが表示される', async ({ page }) => {
    const items = [makeItem('0001', 'を創り出す', mockWordData, 'create')]
    await seedDictationSession(page, items)

    await page.getByLabel('英単語を入力').fill('create')
    await page.getByLabel('英単語を入力').press('Enter')

    await expect(page.getByRole('button', { name: '結果を見る' })).toBeVisible()
  })

  test('DICTATION-101: sessionType が dictation でない session で /dictation にアクセスするとトップへリダイレクトする', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        'idiom-app-session',
        JSON.stringify({
          settings: {
            bookId: 'word-target-1900',
            startNumber: 1,
            endNumber: 1,
            mode: 'idiom',
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

    await page.goto('./#/dictation')
    await expect(page).toHaveURL(/#\/$/)
  })
})
