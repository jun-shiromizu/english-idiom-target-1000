import { test, expect } from '@playwright/test'

const ITEM1 = {
  number: '0001',
  idiomData: {
    idioms: ['a piece of ~'],
    means: [
      {
        'idiom-jp': '〜の1つ',
        'example-sentence': 'I handed him a piece of paper.',
        'sentence-jp': '私は彼に1枚の紙を渡した。',
      },
    ],
    notes: [],
  },
  questionText: 'a piece of ~',
  idiomIndex: 0,
}

const ITEM2 = {
  number: '0002',
  idiomData: {
    idioms: ['as a rule'],
    means: [
      {
        'idiom-jp': '一般に',
        'example-sentence': 'As a rule, he is punctual.',
        'sentence-jp': '一般に、彼は時間を守る。',
      },
    ],
    notes: [],
  },
  questionText: 'as a rule',
  idiomIndex: 0,
}

// simplifyMeaningLabel('〜の1つ') → '〜の1つ'
const ITEM1_CORRECT = '〜の1つ'
// simplifyMeaningLabel('一般に') → '一般に'
const ITEM2_CORRECT = '一般に'

async function setupGame(page: Parameters<typeof test.beforeEach>[0] extends (args: infer T) => any ? T['page'] : never) {
  await page.goto('./')
  await page.evaluate(({ item1, item2 }: { item1: typeof ITEM1; item2: typeof ITEM2 }) => {
    localStorage.setItem(
      'idiom-app-session',
      JSON.stringify({
        settings: {
          bookId: 'idiom-target-1000',
          startNumber: 1,
          endNumber: 2,
          mode: 'idiom',
          target: 'all',
          order: 'sequential',
        },
        items: [item1, item2],
        currentIndex: 0,
        results: {},
      }),
    )
    // Use easy difficulty so each wrong click drops fallY by 58px;
    // 4 wrong clicks (24 + 58*4 = 256 ≥ 252) triggers game over immediately.
    localStorage.setItem('idiom-app-game-settings', JSON.stringify({ difficulty: 'easy' }))
  }, { item1: ITEM1, item2: ITEM2 })
  await page.goto('./#/game')
}

function getChoiceButton(page: Parameters<typeof test.beforeEach>[0] extends (args: infer T) => any ? T['page'] : never, label: string) {
  return page.getByRole('button', { name: label, exact: true })
}

/** Click a wrong-answer button for the current question. */
async function clickWrong(page: Parameters<typeof test.beforeEach>[0] extends (args: infer T) => any ? T['page'] : never, correctLabel: string) {
  const wrongLabel = correctLabel === ITEM1_CORRECT ? ITEM2_CORRECT : ITEM1_CORRECT
  await getChoiceButton(page, wrongLabel).click()
}

test.describe('ゲームモード - 完了画面での間違えた問題一覧表示', () => {
  test('GAME-001: ゲームオーバー時に間違えた問題が表形式で表示される', async ({ page }) => {
    await setupGame(page)

    // 4 wrong answers → game over (fallY 24 + 58*4 = 256 ≥ maxFallY 252)
    for (let i = 0; i < 4; i++) {
      await clickWrong(page, ITEM1_CORRECT)
    }

    await expect(page.getByText('ゲームオーバー')).toBeVisible()
    await expect(page.getByText(/間違えた問題/)).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'No.' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '問題' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '正解' })).toBeVisible()
    await expect(page.getByRole('cell', { name: '0001' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'a piece of ~' })).toBeVisible()
    await expect(page.getByRole('cell', { name: ITEM1_CORRECT })).toBeVisible()
  })

  test('GAME-002: ゲームクリア時に間違えた問題が表形式で表示される', async ({ page }) => {
    await setupGame(page)

    // Wrong once on item 1 (fallY 24+58=82, not game over)
    await clickWrong(page, ITEM1_CORRECT)
    // Correct on item 1 → isResolving for 180ms → nextQuestion() → item 2 choices load
    await getChoiceButton(page, ITEM1_CORRECT).click()
    // Wait for item 2's correct button to appear and become enabled
    await getChoiceButton(page, ITEM2_CORRECT).click({ timeout: 2000 })

    await expect(page.getByText('ゲームクリア')).toBeVisible({ timeout: 2000 })
    await expect(page.getByText(/間違えた問題/)).toBeVisible()
    await expect(page.getByRole('cell', { name: '0001' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'a piece of ~' })).toBeVisible()
    await expect(page.getByRole('cell', { name: ITEM1_CORRECT })).toBeVisible()
    // Item 2 (answered correctly) should NOT appear in the table
    await expect(page.getByRole('cell', { name: 'as a rule' })).not.toBeVisible()
  })

  test('GAME-003: 全問正解の場合は間違えた問題テーブルを表示しない', async ({ page }) => {
    await setupGame(page)

    // Correct on item 1 → wait → correct on item 2 → game clear
    await getChoiceButton(page, ITEM1_CORRECT).click()
    await getChoiceButton(page, ITEM2_CORRECT).click({ timeout: 2000 })

    await expect(page.getByText('ゲームクリア')).toBeVisible({ timeout: 2000 })
    await expect(page.getByText(/間違えた問題/)).not.toBeVisible()
  })

  test('GAME-004: 同じ問題を複数回間違えても表には1回だけ表示される', async ({ page }) => {
    await setupGame(page)

    // 4 wrong answers on the same question → game over
    for (let i = 0; i < 4; i++) {
      await clickWrong(page, ITEM1_CORRECT)
    }

    await expect(page.getByText('ゲームオーバー')).toBeVisible()
    await expect(page.getByRole('cell', { name: '0001' })).toHaveCount(1)
  })

  test('GAME-005: もう一度ボタンでリスタートすると間違えた問題テーブルがリセットされる', async ({ page }) => {
    await setupGame(page)

    // Wrong 4 times → game over with wrong answers table
    for (let i = 0; i < 4; i++) {
      await clickWrong(page, ITEM1_CORRECT)
    }
    await expect(page.getByText(/間違えた問題/)).toBeVisible()

    // Restart the game
    await page.getByRole('button', { name: 'もう一度' }).click()

    // Answer all questions correctly → game clear without wrong answers table
    await getChoiceButton(page, ITEM1_CORRECT).click()
    await getChoiceButton(page, ITEM2_CORRECT).click({ timeout: 2000 })

    await expect(page.getByText('ゲームクリア')).toBeVisible({ timeout: 2000 })
    await expect(page.getByText(/間違えた問題/)).not.toBeVisible()
  })

  test('GAME-006: 完了画面にゲーム設定の詳細が表示される', async ({ page }) => {
    await setupGame(page)

    for (let i = 0; i < 4; i++) {
      await clickWrong(page, ITEM1_CORRECT)
    }

    await expect(page.getByText('ゲームオーバー')).toBeVisible()
    await expect(page.getByText('教材')).toBeVisible()
    await expect(page.getByText('英熟語ターゲット1000')).toBeVisible()
    await expect(page.getByText(/開始番号\s*1/)).toBeVisible()
    await expect(page.getByText(/終了番号\s*2/)).toBeVisible()
    await expect(page.getByText(/出題形式\s*単語／熟語（英語 → 日本語）/)).toBeVisible()
    await expect(page.getByText(/出題対象\s*すべて/)).toBeVisible()
    await expect(page.getByText(/出題順序\s*番号順/)).toBeVisible()
    await expect(page.getByText(/ゲーム難易度\s*イージー/)).toBeVisible()
  })
})
