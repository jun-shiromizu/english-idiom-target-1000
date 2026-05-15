import { test, expect } from '@playwright/test'

const mockQuizData = {
  idioms: ['a piece of ~'],
  means: [
    {
      'idiom-jp': '1つの〜',
      'example-sentence': 'I handed him a piece of paper.',
      'sentence-jp': '私は彼に1枚の紙を渡した。',
    },
  ],
  notes: [],
}

async function mockGitHubDataRequests(
  page: Parameters<typeof test.beforeEach>[0] extends (args: infer T) => any ? T['page'] : never,
  expectedContentsUrl: string,
  expectedRawUrl: string,
) {
  const requestedUrls: string[] = []

  await page.route('https://api.github.com/**', async (route) => {
    const url = route.request().url()
    requestedUrls.push(url)

    if (url === expectedContentsUrl) {
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
    requestedUrls.push(url)

    if (url === expectedRawUrl) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockQuizData),
      })
      return
    }

    await route.fulfill({ status: 404, body: 'not found' })
  })

  return requestedUrls
}

async function getSavedSession(page: Parameters<typeof test.beforeEach>[0] extends (args: infer T) => any ? T['page'] : never) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('idiom-app-session')
    return raw ? JSON.parse(raw) : null
  })
}

async function seedSavedSession(
  page: Parameters<typeof test.beforeEach>[0] extends (args: infer T) => any ? T['page'] : never,
  bookId: 'idiom-target-1000' | 'word-target-1900',
) {
  await page.evaluate(({ bookId, item }) => {
    localStorage.setItem(
      'idiom-app-session',
      JSON.stringify({
        settings: {
          bookId,
          startNumber: 1,
          endNumber: 3,
          mode: 'idiom',
          target: 'all',
          order: 'sequential',
        },
        items: [item, { ...item, number: '0002', questionText: 'second item' }, { ...item, number: '0003', questionText: 'third item' }],
        currentIndex: 1,
        results: { 0: true },
      }),
    )
  }, {
    bookId,
    item: {
      number: '0001',
      idiomData: mockQuizData,
      questionText: 'a piece of ~',
      idiomIndex: 0,
    },
  })
  await page.reload()
}

test.describe('トップページ - 出題設定フォーム', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('HOME-001: ページを開くと出題設定フォームが表示される', async ({ page }) => {
    await expect(page.getByLabel('教材')).toBeVisible()
    await expect(page.getByRole('radio', { name: '英単語ターゲット1900' })).toBeChecked()
    await expect(page.getByRole('radio', { name: '英熟語ターゲット1000' })).not.toBeChecked()
    await expect(page.getByLabel('開始番号')).toBeVisible()
    await expect(page.getByLabel('終了番号')).toBeVisible()
    await expect(page.getByLabel('出題形式')).toBeVisible()
    await expect(page.getByText('単語／熟語（英語 → 日本語）', { exact: true })).toBeVisible()
    await expect(page.getByLabel('出題対象')).toBeVisible()
    await expect(page.getByLabel('出題順序')).toBeVisible()
    await expect(page.getByRole('button', { name: '開始' })).toBeVisible()
  })

  test('HOME-002: 不正解履歴のリセットセクションが表示される', async ({ page }) => {
    await expect(page.getByRole('button', { name: /全履歴をクリア/ })).toBeVisible()
  })

  test('HOME-003: 英熟語ターゲット1000で開始すると熟語データの取得先を使って出題画面へ遷移する', async ({ page }) => {
    const requestedUrls = await mockGitHubDataRequests(
      page,
      'https://api.github.com/repos/jun-shiromizu/english-idiom-target-1000-data/contents/idiom-target-1000/target',
      'https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/idiom-target-1000/target/0001.json',
    )

    await page.getByRole('radio', { name: '英熟語ターゲット1000' }).click()
    await page.getByLabel('開始番号').fill('1')
    await page.getByLabel('終了番号').fill('1')
    await page.getByRole('button', { name: '開始' }).click()

    await expect(page).toHaveURL(/#\/quiz/)
    expect(requestedUrls).toContain(
      'https://api.github.com/repos/jun-shiromizu/english-idiom-target-1000-data/contents/idiom-target-1000/target',
    )
    expect(requestedUrls).toContain(
      'https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/idiom-target-1000/target/0001.json',
    )
  })

  test('HOME-004: 英単語ターゲット1900で開始すると単語データの取得先を使って出題画面へ遷移する', async ({ page }) => {
    const requestedUrls = await mockGitHubDataRequests(
      page,
      'https://api.github.com/repos/jun-shiromizu/english-idiom-target-1000-data/contents/word-target-1900/target',
      'https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/word-target-1900/target/0001.json',
    )

    await page.getByRole('radio', { name: '英単語ターゲット1900' }).click()
    await page.getByLabel('開始番号').fill('1')
    await page.getByLabel('終了番号').fill('1')
    await page.getByRole('button', { name: '開始' }).click()

    await expect(page).toHaveURL(/#\/quiz/)
    expect(requestedUrls).toContain(
      'https://api.github.com/repos/jun-shiromizu/english-idiom-target-1000-data/contents/word-target-1900/target',
    )
    expect(requestedUrls).toContain(
      'https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/word-target-1900/target/0001.json',
    )
  })

  test('HOME-005: 英熟語ターゲット1000で開始すると熟語教材の session が保存される', async ({ page }) => {
    await mockGitHubDataRequests(
      page,
      'https://api.github.com/repos/jun-shiromizu/english-idiom-target-1000-data/contents/idiom-target-1000/target',
      'https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/idiom-target-1000/target/0001.json',
    )

    await page.getByRole('radio', { name: '英熟語ターゲット1000' }).click()
    await page.getByLabel('開始番号').fill('1')
    await page.getByLabel('終了番号').fill('1')
    await page.getByRole('button', { name: '開始' }).click()

    await expect(page).toHaveURL(/#\/quiz/)

    const session = await getSavedSession(page)

    expect(session).not.toBeNull()
    expect(session.settings.bookId).toBe('idiom-target-1000')
    expect(session.currentIndex).toBe(0)
    expect(session.results).toEqual({})
    expect(session.items).toHaveLength(1)
    expect(session.items[0].number).toBe('0001')
    expect(session.items[0].questionText).toBe('a piece of ~')
  })

  test('HOME-006: 英単語ターゲット1900で開始すると単語教材の session が保存される', async ({ page }) => {
    await mockGitHubDataRequests(
      page,
      'https://api.github.com/repos/jun-shiromizu/english-idiom-target-1000-data/contents/word-target-1900/target',
      'https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/word-target-1900/target/0001.json',
    )

    await page.getByRole('radio', { name: '英単語ターゲット1900' }).click()
    await page.getByLabel('開始番号').fill('1')
    await page.getByLabel('終了番号').fill('1')
    await page.getByRole('button', { name: '開始' }).click()

    await expect(page).toHaveURL(/#\/quiz/)

    const session = await getSavedSession(page)

    expect(session).not.toBeNull()
    expect(session.settings.bookId).toBe('word-target-1900')
    expect(session.currentIndex).toBe(0)
    expect(session.results).toEqual({})
    expect(session.items).toHaveLength(1)
    expect(session.items[0].number).toBe('0001')
    expect(session.items[0].questionText).toBe('a piece of ~')
  })

  test('HOME-007: 英熟語ターゲット1000の保存済み session があると再開バナーに教材名が表示される', async ({ page }) => {
    await seedSavedSession(page, 'idiom-target-1000')

    await expect(
      page.getByText('前回のセッションが保存されています （英熟語ターゲット1000 / 1 / 3問目）'),
    ).toBeVisible()
  })

  test('HOME-008: 英単語ターゲット1900の保存済み session があると再開バナーから出題画面へ遷移できる', async ({ page }) => {
    await seedSavedSession(page, 'word-target-1900')

    await expect(
      page.getByText('前回のセッションが保存されています （英単語ターゲット1900 / 1 / 3問目）'),
    ).toBeVisible()
    await page.getByRole('button', { name: '再開する' }).click()

    await expect(page).toHaveURL(/#\/quiz/)
  })

  test('HOME-009: 出題設定を変更すると次回表示時にも同じ選択状態が復元される', async ({ page }) => {
    await page.getByRole('radio', { name: '英熟語ターゲット1000' }).click()
    await page.getByLabel('開始番号').fill('101')
    await page.getByLabel('終了番号').fill('110')
    await page.getByRole('combobox', { name: '出題形式' }).press('ArrowDown')
    await page.getByRole('option', { name: '例文（英語 → 日本語）' }).click()
    await page.getByRole('combobox', { name: '出題対象' }).press('ArrowDown')
    await page.getByRole('option', { name: '間違えたものだけ' }).click()
    await page.getByRole('combobox', { name: '出題順序' }).press('ArrowDown')
    await page.getByRole('option', { name: 'ランダム' }).click()

    await page.reload()

    await expect(page.getByRole('radio', { name: '英熟語ターゲット1000' })).toBeChecked()
    await expect(page.getByLabel('開始番号')).toHaveValue('101')
    await expect(page.getByLabel('終了番号')).toHaveValue('110')
    await expect(page.getByRole('combobox', { name: '出題形式' })).toHaveValue('例文（英語 → 日本語）')
    await expect(page.getByRole('combobox', { name: '出題対象' })).toHaveValue('間違えたものだけ')
    await expect(page.getByRole('combobox', { name: '出題順序' })).toHaveValue('ランダム')
  })

  test('HOME-301: 教材を英単語ターゲット1900に切り替えると 1900 番まで入力できる', async ({ page }) => {
    await page.getByRole('radio', { name: '英単語ターゲット1900' }).click()
    await page.getByLabel('開始番号').fill('1500')
    await page.getByLabel('終了番号').fill('1900')

    await expect(page.getByLabel('開始番号')).toHaveValue('1500')
    await expect(page.getByLabel('終了番号')).toHaveValue('1900')
  })

  test('HOME-302: 英単語ターゲット1900で 1000 超の番号を入力後に英熟語ターゲット1000へ切り替えると 1000 に補正される', async ({ page }) => {
    await page.getByRole('radio', { name: '英単語ターゲット1900' }).click()
    await page.getByLabel('開始番号').fill('1500')
    await page.getByLabel('終了番号').fill('1900')

    await page.getByRole('radio', { name: '英熟語ターゲット1000' }).click()

    await expect(page.getByLabel('開始番号')).toHaveValue('1000')
    await expect(page.getByLabel('終了番号')).toHaveValue('1000')
  })
})
