import { test, expect, type Page } from '@playwright/test'
import {
  makeClassicSession,
  makeClassicWord,
  makeRichClassicWord,
  mockClassicData,
  readHistory,
  readSession,
  seedSession,
  startClassicFromHome,
} from '../helpers/classicJapanese'

type TouchPoint = { x: number; y: number }

async function swipeWithRealTouch(page: Page, from: TouchPoint, to: TouchPoint, steps = 12) {
  const client = await page.context().newCDPSession(page)
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
  for (let i = 1; i <= steps; i++) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{
        x: from.x + ((to.x - from.x) * i) / steps,
        y: from.y + ((to.y - from.y) * i) / steps,
      }],
    })
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await client.detach()
}

function questionCard(page: Page) {
  return page.getByRole('button', { name: 'タップまたはクリックして回答を表示' })
}

function answerSection(page: Page, name: string) {
  return page.getByRole('region', { name, exact: true })
}

test.describe('単語帳 - 古文単語330の回答から結果表示', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('QUIZ-004: 古文単語330の見出し語問題で回答を表示すると全ての意味・例文・POINT・出典ページが表示される', async ({ page }) => {
    const allRequests: string[] = []
    page.on('request', (request) => allRequests.push(request.url()))
    await mockClassicData(page, { '0001': makeRichClassicWord('0001') })

    await startClassicFromHome(page, { start: '1', end: '1' })

    await expect(page).toHaveURL(/#\/quiz/)
    await expect(questionCard(page)).toContainText('ためしごと')
    await expect(questionCard(page)).toContainText('意味を2つ答えてください')

    await questionCard(page).click()

    await expect(answerSection(page, '見出し語')).toContainText('ためしごと')
    const meanings = answerSection(page, '意味')
    await expect(meanings).toContainText('1. 試しの言葉')
    await expect(meanings).toContainText('2. 練習用の語')
    for (const text of [
      'ためしごとを言ふ。',
      '試しの言葉を言う。',
      'ためしごとぞ聞こゆる。',
      '試しの言葉が聞こえる。',
      'ためしごとにて習ふ。',
      '練習用の語で習う。',
    ]) {
      await expect(meanings).toContainText(text)
    }
    await expect(answerSection(page, 'POINT')).toContainText('テスト用のPOINTである。')
    await expect(answerSection(page, '出典ページ')).toHaveText(/出典ページ\s*p\.28、p\.29$/)
    expect(allRequests.filter((url) => url.endsWith('.jpg'))).toEqual([])
  })

  test('QUIZ-005: 古文単語330の例文形式では意味と例文の組ごとに出題され、回答に現代語訳と該当する意味が表示される', async ({ page }) => {
    await mockClassicData(page, { '0001': makeRichClassicWord('0001') })

    await startClassicFromHome(page, { start: '1', end: '1', mode: '例文' })

    await expect(page).toHaveURL(/#\/quiz/)
    const session = await readSession(page)
    expect(session.items.map((item: { questionText: string }) => item.questionText)).toEqual([
      'ためしごとを言ふ。',
      'ためしごとぞ聞こゆる。',
      'ためしごとにて習ふ。',
    ])
    await expect(questionCard(page)).toContainText('ためしごとを言ふ。')

    await questionCard(page).click()

    await expect(answerSection(page, '例文')).toContainText('ためしごとを言ふ。')
    await expect(answerSection(page, '現代語訳')).toContainText('試しの言葉を言う。')
    await expect(answerSection(page, '該当する意味')).toContainText('1. 試しの言葉')
  })

  test('QUIZ-006: 古文単語330の全問に回答すると結果画面に正解率が表示され、間違えた問題だけ再挑戦できる', async ({ page }) => {
    await mockClassicData(page, { '0001': makeClassicWord('0001', { words: ['ためしごと', 'ためしこと'] }) })

    await startClassicFromHome(page, { start: '1', end: '1' })

    await expect(questionCard(page)).toContainText('ためしごと')
    await questionCard(page).click()
    await page.getByRole('button', { name: '正解', exact: true }).click()

    await expect(questionCard(page)).toContainText('ためしこと')
    await questionCard(page).click()
    await page.getByRole('button', { name: '不正解', exact: true }).click()

    await expect(page).toHaveURL(/#\/result/)
    await expect(page.getByText('正解率: 50%', { exact: true })).toBeVisible()
    const classicHistory = Object.entries(await readHistory(page)).filter(([key]) =>
      key.includes('"classic-japanese-330"'),
    )
    expect(classicHistory.map(([, correct]) => correct).sort()).toEqual([false, true])

    await page.getByRole('button', { name: '間違えたところをやり直す' }).click()

    await expect(page).toHaveURL(/#\/quiz/)
    await expect(questionCard(page)).toContainText('ためしこと')
    const retrySession = await readSession(page)
    expect(retrySession.items.map((item: { questionText: string }) => item.questionText)).toEqual(['ためしこと'])
  })

  test('QUIZ-201: 保存された古文単語330の session が不正な場合はトップへ戻って理由を表示し、保存データを削除しない', async ({ page }) => {
    const brokenSession = makeClassicSession([makeClassicWord('0001')], { words: {} })
    await seedSession(page, brokenSession)

    await page.goto('./#/quiz')

    await expect(page).toHaveURL(/#\/$/)
    await expect(
      page.getByText('保存されている古文単語330の単語帳を再開できないため、トップへ戻りました。保存データは削除していません。'),
    ).toBeVisible()
    await expect(page.getByText(/保存されている古文単語330の単語帳を再開できません（.+）。/)).toBeVisible()
    await expect(page.getByRole('button', { name: '破棄する' })).toBeVisible()
    expect(await readSession(page)).toEqual(brokenSession)
  })

  test('QUIZ-301: 改行やHTML風の文字列を含む古文データをプレーンテキストのまま表示する', async ({ page }) => {
    await mockClassicData(page, {
      '0001': makeClassicWord('0001', {
        means: [{
          senseNumber: 1,
          meaning: '<b>強調</b>の意味',
          examples: [{ text: 'ひとつめの行\nふたつめの行', translation: '改行を含む訳' }],
        }],
      }),
    })

    await startClassicFromHome(page, { start: '1', end: '1' })
    await questionCard(page).click()

    await expect(answerSection(page, '意味')).toContainText('1. <b>強調</b>の意味')
    await expect(page.getByText('ひとつめの行')).toHaveJSProperty('innerText', 'ひとつめの行\nふたつめの行')
  })
})

test.describe('単語帳 - 古文単語330のスマートフォンでのスワイプ判定', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('QUIZ-007: スマートフォンで古文の長い回答を縦スクロールしても判定されず、左右スワイプで判定される', async ({ page }) => {
    await page.goto('./')
    await page.evaluate(() => localStorage.clear())
    const longWord = makeClassicWord('0001', {
      words: ['ながきことば'],
      means: Array.from({ length: 8 }, (_, i) => ({
        senseNumber: i + 1,
        meaning: `長い意味${i + 1}`,
        examples: [{
          text: `これは回答画面をスクロール可能にするための長い古文の例文${i + 1}なり。`,
          translation: `これは回答画面をスクロール可能にするための長い現代語訳${i + 1}です。`,
        }],
      })),
    })
    await seedSession(page, makeClassicSession([longWord, makeClassicWord('0002', { words: ['みじかきことば'] })]))

    await page.goto('./#/quiz')
    await questionCard(page).click()
    await expect(answerSection(page, '意味')).toContainText('長い意味1')

    // 縦スクロールは維持され、回答は判定しない
    const scrollYBefore = await page.evaluate(() => window.scrollY)
    await swipeWithRealTouch(page, { x: 200, y: 600 }, { x: 215, y: 300 })
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollYBefore)
    expect((await readSession(page)).results).toEqual({})
    await expect(page.getByRole('button', { name: '不正解', exact: true })).toBeVisible()

    // 縦ブレを含む左スワイプ
    await swipeWithRealTouch(page, { x: 330, y: 400 }, { x: 90, y: 470 })
    await expect(questionCard(page)).toContainText('みじかきことば')
    expect((await readSession(page)).results).toEqual({ 0: false })

    await questionCard(page).click()
    await expect(answerSection(page, '意味')).toBeVisible()

    // 縦ブレを含む右スワイプ
    await swipeWithRealTouch(page, { x: 60, y: 450 }, { x: 300, y: 390 })
    await expect(page).toHaveURL(/#\/result/)
    expect((await readSession(page)).results).toEqual({ 0: false, 1: true })
  })
})
