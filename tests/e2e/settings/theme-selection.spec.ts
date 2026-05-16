import { expect, test } from '@playwright/test'

const THEME_STORAGE_KEY = 'idiom-app-theme'

function themeCard(page: Parameters<typeof test.beforeEach>[0] extends (args: infer T) => any ? T['page'] : never, name: string) {
  return page.locator('.theme-card').filter({ hasText: name }).first()
}

test.describe('設定画面 - テーマ選択', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('SETTINGS-001: トップページから設定画面へ遷移できる', async ({ page }) => {
    await page.getByRole('button', { name: 'テーマ設定' }).click()

    await expect(page).toHaveURL(/#\/settings/)
    await expect(page.getByRole('heading', { name: 'テーマ設定' })).toBeVisible()
  })

  test('SETTINGS-002: テーマを選択すると即時に保存される', async ({ page }) => {
    await page.goto('./#/settings')
    await themeCard(page, 'オーロラ').getByRole('button', { name: 'このテーマを使う' }).click()

    await expect(page.locator('.v-application')).toHaveAttribute('data-theme-id', 'aurora')

    const savedTheme = await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)
    expect(savedTheme).toBe('aurora')
  })

  test('SETTINGS-003: 保存済みテーマは再読み込み後も反映される', async ({ page }) => {
    await page.goto('./#/settings')
    await themeCard(page, 'コスモス').getByRole('button', { name: 'このテーマを使う' }).click()

    await page.reload()

    await expect(page.locator('.v-application')).toHaveAttribute('data-theme-id', 'cosmos')
    await expect(themeCard(page, 'コスモス').getByRole('button', { name: '使用中のテーマ' })).toBeVisible()
  })
})