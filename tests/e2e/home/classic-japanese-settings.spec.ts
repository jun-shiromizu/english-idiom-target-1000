import { test, expect } from '@playwright/test'
import {
  CLASSIC_LIST_URL,
  CLASSIC_RAW_BASE,
  makeClassicSession,
  makeClassicWord,
  mockClassicData,
  readSession,
  seedSession,
  startClassicFromHome,
} from '../helpers/classicJapanese'

const englishIdiomSession = {
  settings: {
    bookId: 'idiom-target-1000',
    startNumber: 1,
    endNumber: 1,
    mode: 'idiom',
    direction: 'en-to-ja',
    target: 'all',
    order: 'sequential',
  },
  items: [
    {
      number: '0001',
      idiomData: {
        idioms: ['a piece of ~'],
        means: [{
          'idiom-jp': '1つの〜',
          'example-sentence': 'I handed him a piece of paper.',
          'sentence-jp': '私は彼に1枚の紙を渡した。',
        }],
        notes: [],
      },
      mode: 'idiom',
      direction: 'en-to-ja',
      questionText: 'a piece of ~',
      idiomIndex: 0,
    },
  ],
  currentIndex: 0,
  results: {},
}

test.describe('トップページ - 古文単語330の出題設定', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('HOME-015: 非対応アクションから古文単語330へ切り替えると単語帳と古文 → 現代語に変更され、非対応の選択肢が無効になる', async ({ page }) => {
    await page.getByRole('radio', { name: '書き取り', exact: true }).click()
    await expect(page.getByRole('radio', { name: '日本語 → 英語' })).toBeChecked()

    await page.getByRole('radio', { name: '古文単語330' }).click()

    await expect(page.getByRole('radio', { name: '古文単語330' })).toBeChecked()
    await expect(page.getByRole('radio', { name: '単語帳', exact: true })).toBeChecked()
    for (const action of ['書き取り', '例文穴埋め', 'タイピング', 'ゲーム', 'バトル']) {
      await expect(page.getByRole('radio', { name: action, exact: true })).toBeDisabled()
    }
    await expect(page.getByRole('radio', { name: '見出し語', exact: true })).toBeChecked()
    await expect(page.getByRole('radio', { name: '例文', exact: true })).toBeEnabled()
    await expect(page.getByRole('radio', { name: '古文 → 現代語' })).toBeChecked()
    await expect(page.getByRole('radio', { name: '現代語 → 古文' })).toBeDisabled()
    await expect(page.getByText('古文単語330は単語帳（古文 → 現代語）のみ対応しています。')).toBeVisible()
    await expect(page.getByText('アクションを単語帳、出題方向を古文 → 現代語に変更しました。')).toBeVisible()
  })

  test('HOME-016: 古文単語330の見出し語で開始すると一覧と対象データを取得し、古文の session を保存して出題画面へ遷移する', async ({ page }) => {
    const allRequests: string[] = []
    page.on('request', (request) => allRequests.push(request.url()))
    const requestedUrls = await mockClassicData(page, {
      '0001': makeClassicWord('0001', { words: ['ためしごと', 'ためしこと'] }),
      '0002': makeClassicWord('0002'),
    })

    await startClassicFromHome(page, { start: '1', end: '2' })

    await expect(page).toHaveURL(/#\/quiz/)
    expect(requestedUrls).toContain(CLASSIC_LIST_URL)
    expect(requestedUrls).toContain(`${CLASSIC_RAW_BASE}/0001.json`)
    expect(requestedUrls).toContain(`${CLASSIC_RAW_BASE}/0002.json`)
    expect(allRequests.filter((url) => url.endsWith('.jpg'))).toEqual([])

    const session = await readSession(page)
    expect(session.contentType).toBe('classic-japanese')
    expect(session.settings).toMatchObject({ bookId: 'classic-japanese-330', direction: 'classic-to-modern' })
    expect(session.items.map((item: { questionText: string }) => item.questionText)).toEqual([
      'ためしごと',
      'ためしこと',
      'ためし0002',
    ])
  })

  test('HOME-017: 古文単語330の保存済み session があると再開バナーに教材名と進捗が表示され、データを再取得せずに再開できる', async ({ page }) => {
    const requestedUrls = await mockClassicData(page, {})
    await seedSession(
      page,
      makeClassicSession([makeClassicWord('0001', { words: ['ためしごと', 'ためしこと'] })], {
        currentIndex: 1,
        results: { 0: true },
      }),
    )
    await page.reload()

    await expect(page.getByText('古文単語330 / 1 / 2問目')).toBeVisible()
    await page.getByRole('button', { name: '再開する' }).click()

    await expect(page).toHaveURL(/#\/quiz/)
    await expect(page.getByRole('button', { name: 'タップまたはクリックして回答を表示' })).toContainText('ためしこと')
    expect(requestedUrls.filter((url) => url.startsWith(CLASSIC_LIST_URL) || url.startsWith(CLASSIC_RAW_BASE))).toEqual([])
  })

  test('HOME-201: 指定範囲のデータが一覧にない場合は番号を含むエラーを表示し、既存の中断セッションを維持する', async ({ page }) => {
    await mockClassicData(page, { '0001': makeClassicWord('0001') }, ['0001'])
    await seedSession(page, englishIdiomSession)
    await page.reload()

    await startClassicFromHome(page, { start: '1', end: '2' })

    await expect(page.getByText('古文単語330の No.0002 のデータが見つかりません。')).toBeVisible()
    await expect(page).not.toHaveURL(/#\/quiz/)
    expect(await readSession(page)).toEqual(englishIdiomSession)
  })

  test('HOME-202: 古文データの形式が不正な場合は番号と項目を含むエラーを表示し、出題画面へ遷移しない', async ({ page }) => {
    await mockClassicData(page, { '0001': makeClassicWord('0001', { means: [] }) })

    await startClassicFromHome(page, { start: '1', end: '1' })

    await expect(
      page.getByText('古文単語330の No.0001 のデータ形式が不正です（means: 1件以上必要です）。'),
    ).toBeVisible()
    await expect(page).not.toHaveURL(/#\/quiz/)
    expect(await readSession(page)).toBeNull()
  })

  test('HOME-203: 古文単語330の session が保存された状態で英語専用の画面を開くと、データを残したままトップへ戻る', async ({ page }) => {
    const session = makeClassicSession([makeClassicWord('0001')])
    await seedSession(page, session)

    await page.goto('./#/dictation')

    await expect(
      page.getByText('古文単語330は書き取りに対応していないため、トップへ戻りました。保存中の古文単語帳のデータは削除していません。'),
    ).toBeVisible()
    await expect(page).toHaveURL(/#\/$/)
    expect(await readSession(page)).toEqual(session)
  })

  test('HOME-303: 古文単語330では 1〜330 番の範囲だけで開始できる', async ({ page }) => {
    const startButton = page.getByRole('button', { name: '開始' })
    await page.getByRole('radio', { name: '古文単語330' }).click()

    await page.getByLabel('開始番号').fill('330')
    await page.getByLabel('終了番号').fill('330')
    await expect(startButton).toBeEnabled()

    await page.getByLabel('終了番号').fill('331')
    await expect(startButton).toBeDisabled()

    await page.getByLabel('終了番号').fill('330')
    await page.getByLabel('開始番号').fill('0')
    await expect(startButton).toBeDisabled()
  })

  test('HOME-304: 英単語ターゲット1900で 330 超の番号を入力後に古文単語330へ切り替えると 330 に補正される', async ({ page }) => {
    await page.getByRole('radio', { name: '英単語ターゲット1900' }).click()
    await page.getByLabel('開始番号').fill('1500')
    await page.getByLabel('終了番号').fill('1900')

    await page.getByRole('radio', { name: '古文単語330' }).click()

    await expect(page.getByLabel('開始番号')).toHaveValue('330')
    await expect(page.getByLabel('終了番号')).toHaveValue('330')
  })
})
