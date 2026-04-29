import { test, expect } from '@playwright/test'

test.describe('トップページ - 出題設定フォーム', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('HOME-001: ページを開くと出題設定フォームが表示される', async ({ page }) => {
    await expect(page.getByLabel('開始番号')).toBeVisible()
    await expect(page.getByLabel('終了番号')).toBeVisible()
    await expect(page.getByLabel('出題形式')).toBeVisible()
    await expect(page.getByLabel('出題対象')).toBeVisible()
    await expect(page.getByLabel('出題順序')).toBeVisible()
    await expect(page.getByRole('button', { name: '開始' })).toBeVisible()
  })

  test('HOME-002: 不正解履歴のリセットセクションが表示される', async ({ page }) => {
    await expect(page.getByRole('button', { name: /全履歴をクリア/ })).toBeVisible()
  })
})
