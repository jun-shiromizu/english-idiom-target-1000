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

async function seedClozeSession(
  page: Parameters<typeof test.beforeEach>[0] extends (args: infer T) => any ? T['page'] : never,
  items: QuizSession['items'],
) {
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
        sessionType: 'cloze',
      }
      localStorage.setItem('idiom-app-session', JSON.stringify(session))
    },
    { items },
  )
  await page.goto('./#/cloze')
}

function getClozeActionButton(
  page: Parameters<typeof test.beforeEach>[0] extends (args: infer T) => any ? T['page'] : never,
  label: string,
) {
  return page.getByRole('button', { name: label }).first()
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

  test('CLOZE-001: 画面を開くと穴埋め問題文と4択が表示される', async ({ page }) => {
    const items = [makeItem('0001', 'Technological change will ____ new ways of living.', mockWordData, 'create')]
    await seedClozeSession(page, items)

    await expect(page.getByText('Technological change will ____ new ways of living.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'create' })).toBeVisible()
    await expect(page.getByRole('progressbar')).toBeVisible()
  })

  test('CLOZE-002: 正しい選択肢を押すと「正解」が表示される', async ({ page }) => {
    const items = [makeItem('0001', 'Technological change will ____ new ways of living.', mockWordData, 'create')]
    await seedClozeSession(page, items)

    await page.getByRole('button', { name: 'create' }).click()

    await expect(page.getByRole('alert').getByText('正解')).toBeVisible()
    await expect(page.getByRole('strong').filter({ hasText: 'create' })).toBeVisible()
    await expect(getClozeActionButton(page, '結果を見る')).toBeVisible()
  })

  test('CLOZE-003: 誤った選択肢を押すと「不正解」が表示される', async ({ page }) => {
    const items = [makeItem('0001', 'Technological change will ____ new ways of living.', mockWordData, 'create')]
    await seedClozeSession(page, items)

    await page.getByRole('button', { name: 'build' }).click()

    await expect(page.getByText('不正解')).toBeVisible()
    await expect(page.getByText('build', { exact: true })).toBeVisible()
  })
})
