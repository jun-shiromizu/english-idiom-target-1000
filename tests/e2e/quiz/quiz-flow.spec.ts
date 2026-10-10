import { test, expect, type Locator } from '@playwright/test'

async function dispatchTouchSequence(
  target: Locator,
  points: Array<{ type: 'touchstart' | 'touchmove' | 'touchend'; x: number; y: number }>,
) {
  await target.evaluate((element, sequence) => {
    for (const { type, x, y } of sequence) {
      const touch = { clientX: x, clientY: y }
      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperties(event, {
        touches: { value: type === 'touchend' ? [] : [touch] },
        changedTouches: { value: [touch] },
      })
      element.dispatchEvent(event)
    }
  }, points)
}

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

  test('QUIZ-002: タッチ開始座標が0でもスワイプを判定し縦移動は回答にしない', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
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
    await page.getByRole('button', { name: 'タップまたはクリックして回答を表示' }).click()

    const meaning = page.getByText('1つの〜', { exact: true })
    await dispatchTouchSequence(meaning, [
      { type: 'touchstart', x: 200, y: 0 },
      { type: 'touchmove', x: 205, y: 140 },
      { type: 'touchend', x: 205, y: 140 },
    ])
    expect(await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('idiom-app-session') ?? 'null')
      return session?.results
    })).toEqual({})
    await expect(page.getByRole('button', { name: '不正解', exact: true })).toBeVisible()

    await dispatchTouchSequence(meaning, [
      { type: 'touchstart', x: 200, y: 0 },
      { type: 'touchmove', x: 60, y: 0 },
      { type: 'touchend', x: 60, y: 0 },
    ])

    await expect(page.getByText('as a rule', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('idiom-app-session') ?? 'null')
      return session?.results
    })).toEqual({ 0: false })

    const secondMeaning = page.getByText('1つの〜', { exact: true })
    await dispatchTouchSequence(secondMeaning, [
      { type: 'touchstart', x: 200, y: 100 },
      { type: 'touchmove', x: 340, y: 100 },
      { type: 'touchend', x: 340, y: 100 },
    ])

    await expect(page).toHaveURL(/#\/result/)
    expect(await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('idiom-app-session') ?? 'null')
      return session?.results
    })).toEqual({ 0: false, 1: true })
  })
})