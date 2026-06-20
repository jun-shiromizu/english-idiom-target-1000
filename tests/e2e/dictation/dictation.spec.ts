import { test, expect } from '@playwright/test'
import type { QuizSession } from '@/types'

const mockWordData = {
  idioms: ['create'],
  means: [
    {
      'idiom-jp': 'を創り出す',
      'example-sentence': 'Technological change will create new ways of living.',
      'sentence-jp': '技術の変化は新たな生活様式を創り出す。',
      cloze: {
        maskedText: 'Technological change will ____ new ways of living.',
        answerBase: 'create',
        answerSurface: 'create',
        choices: ['create', 'build', 'change', 'shape'],
      },
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
      cloze: {
        maskedText: 'She ____ a new skill.',
        answerBase: 'acquire',
        answerSurface: 'acquired',
        choices: ['acquired', 'created', 'changed', 'handled'],
      },
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
          mode: 'sentence',
          direction: 'en-to-ja',
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

function makeItem(
  number: string,
  questionText: string,
  idiomData: typeof mockWordData,
  answerSurface: string,
) {
  return {
    number,
    idiomData,
    mode: 'sentence',
    direction: 'en-to-ja',
    questionText,
    idiomIndex: 0,
    meanIndex: 0,
    cloze: {
      maskedText: questionText,
      answerBase: idiomData.idioms[0],
      answerSurface,
      choices: idiomData.means[0].cloze.choices,
    },
  }
}

test.describe('例文穴埋めモード', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('./')
  })

  test('DICTATION-001: 画面を開くと穴埋め問題文と4択が表示される', async ({ page }) => {
    const items = [makeItem('0001', 'Technological change will ____ new ways of living.', mockWordData, 'create')]
    await seedDictationSession(page, items)

    await expect(page.getByText('Technological change will ____ new ways of living.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'create' })).toBeVisible()
    await expect(page.getByRole('progressbar')).toBeVisible()
  })

  test('DICTATION-002: 正しい選択肢を押すと「正解」が表示される', async ({ page }) => {
    const items = [makeItem('0001', 'Technological change will ____ new ways of living.', mockWordData, 'create')]
    await seedDictationSession(page, items)

    await page.getByRole('button', { name: 'create' }).click()

    await expect(page.getByRole('alert').getByText('正解')).toBeVisible()
    await expect(page.getByRole('strong').filter({ hasText: 'create' })).toBeVisible()
    await expect(page.getByRole('button', { name: '結果を見る' })).toBeVisible()
  })

  test('DICTATION-003: 誤った選択肢を押すと「不正解」が表示される', async ({ page }) => {
    const items = [makeItem('0001', 'Technological change will ____ new ways of living.', mockWordData, 'create')]
    await seedDictationSession(page, items)

    await page.getByRole('button', { name: 'build' }).click()

    await expect(page.getByText('不正解')).toBeVisible()
    await expect(page.getByText('build', { exact: true })).toBeVisible()
  })

  test('DICTATION-004: 「次の問題へ」を押すと次の問題が表示される', async ({ page }) => {
    const items = [
      makeItem('0001', 'Technological change will ____ new ways of living.', mockWordData, 'create'),
      makeItem('0002', 'She ____ a new skill.', mockWordData2, 'acquired'),
    ]
    await seedDictationSession(page, items)

    await page.getByRole('button', { name: 'create' }).click()
    await page.getByRole('button', { name: '次の問題へ' }).click()

    await expect(page.getByText('She ____ a new skill.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'acquired' })).toBeVisible()
  })

  test('DICTATION-005: 最後の問題に回答すると「結果を見る」ボタンが表示される', async ({ page }) => {
    const items = [makeItem('0001', 'Technological change will ____ new ways of living.', mockWordData, 'create')]
    await seedDictationSession(page, items)

    await page.getByRole('button', { name: 'create' }).click()

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

    await page.goto('./#/dictation')
    await expect(page).toHaveURL(/#\/$/)
  })
})
