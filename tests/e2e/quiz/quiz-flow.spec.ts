import { test, expect } from '@playwright/test'

test.describe('通常クイズ - 回答から結果表示', () => {
  test('QUIZ-001: 2問に回答すると結果画面に正解数と正解率が表示される', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('./')

    await page.evaluate(() => {
      const idiomData = {
        idioms: ['a piece of ~'],
        means: [{
          'idiom-jp': '1つの〜',
          'example-sentence': 'I handed him a piece of paper.',
          'sentence-jp': '私は彼に1枚の紙を渡した。',
        }],
        notes: [],
      }
      const session = {
        settings: {
          bookId: 'idiom-target-1000',
          startNumber: 1,
          endNumber: 2,
          mode: 'idiom',
          direction: 'en-to-ja',
          target: 'all',
          order: 'sequential',
        },
        items: [
          {
            number: '0001',
            idiomData,
            mode: 'idiom',
            direction: 'en-to-ja',
            questionText: 'a piece of ~',
            idiomIndex: 0,
          },
          {
            number: '0002',
            idiomData: {
              ...idiomData,
              idioms: ['as a rule'],
              means: [{
                'idiom-jp': '一般に',
                'example-sentence': 'As a rule, he is punctual.',
                'sentence-jp': '一般に、彼は時間を守る。',
              }],
            },
            mode: 'idiom',
            direction: 'en-to-ja',
            questionText: 'as a rule',
            idiomIndex: 0,
          },
        ],
        currentIndex: 0,
        results: {},
      }
      localStorage.setItem('idiom-app-session', JSON.stringify(session))
    })

    await page.goto('./#/quiz')

    const revealAnswerButton = page.getByRole('button', { name: 'タップまたはクリックして回答を表示' })
    await expect(page.getByText('a piece of ~', { exact: true })).toBeVisible()
    await revealAnswerButton.click()
    await page.getByRole('button', { name: '正解', exact: true }).click()

    await expect(page.getByText('as a rule', { exact: true })).toBeVisible()
    await revealAnswerButton.click()
    await page.getByRole('button', { name: '不正解', exact: true }).click()

    await expect(page).toHaveURL(/#\/result/)
    await expect(page.getByRole('heading', { name: '結果' })).toBeVisible()
    await expect(page.getByText('正解率: 50%', { exact: true })).toBeVisible()

    const results = await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('idiom-app-session') ?? 'null')
      return session?.results
    })
    expect(results).toEqual({ 0: true, 1: false })
  })
})