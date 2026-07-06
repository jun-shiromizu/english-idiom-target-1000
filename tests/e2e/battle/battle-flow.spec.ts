import { test, expect } from '@playwright/test'

const battleCharacters = [
  {
    id: 'hero-001',
    name: 'Leader',
    icon: 'battle/icons/characters/hero-001.png',
    atk: 100,
    hp: 1000,
    leaderSkill: {
      id: 'leader-1',
      name: 'Leader Skill',
      effects: [{ effectType: 'atk-multiplier', value: 1.5 }],
      description: 'leader',
    },
    activeSkill: {
      id: 'skill-1',
      name: 'Skill 1',
      effects: [{ effectType: 'heal', value: 0.1 }],
      cooldownTurns: 3,
      description: 'heal',
    },
  },
  ...Array.from({ length: 4 }, (_, index) => ({
    id: `hero-00${index + 2}`,
    name: `Member ${index + 1}`,
    icon: `battle/icons/characters/hero-00${index + 2}.png`,
    atk: 80,
    hp: 500,
    leaderSkill: {
      id: `leader-${index + 2}`,
      name: 'Unused',
      effects: [{ effectType: 'atk-multiplier', value: 1 }],
      description: 'unused',
    },
    activeSkill: {
      id: `skill-${index + 2}`,
      name: `Member Skill ${index + 1}`,
      effects: [{ effectType: 'damage-cut', value: 0.5, durationTurns: 1 }],
      cooldownTurns: 4,
      description: 'cut',
    },
  })),
]

const battleDungeons = [
  {
    id: 'dungeon-001',
    name: 'Test Dungeon',
    description: 'sample dungeon',
    enemies: [{ id: 'slime', name: 'Slime', icon: 'battle/icons/enemies/slime.png', atk: 30, hp: 120 }],
  },
  {
    id: 'dungeon-002',
    name: 'Wave Dungeon',
    description: 'two waves',
    enemies: [
      { id: 'slime', name: 'Slime', icon: 'battle/icons/enemies/slime.png', atk: 30, hp: 100 },
      { id: 'bat', name: 'Bat', icon: 'battle/icons/enemies/bat.png', atk: 40, hp: 220 },
    ],
  },
  {
    id: 'dungeon-003',
    name: 'Defeat Dungeon',
    description: 'lethal counter',
    enemies: [{ id: 'boss', name: 'Boss', icon: 'battle/icons/enemies/boss.png', atk: 9999, hp: 500 }],
  },
]

const quizNumbers = ['0001', '0002', '0003', '0004']
const quizDataMap: Record<string, { idioms: string[]; means: Array<{ 'idiom-jp': string; 'example-sentence': string; 'sentence-jp': string }>; notes: string[] }> = {
  '0001': {
    idioms: ['a piece of ~'],
    means: [{ 'idiom-jp': '1つの〜', 'example-sentence': 'I handed him a piece of paper.', 'sentence-jp': '私は彼に1枚の紙を渡した。' }],
    notes: [],
  },
  '0002': {
    idioms: ['as a rule'],
    means: [{ 'idiom-jp': '一般に', 'example-sentence': 'As a rule, he is punctual.', 'sentence-jp': '一般に、彼は時間を守る。' }],
    notes: [],
  },
  '0003': {
    idioms: ['after all'],
    means: [{ 'idiom-jp': '結局', 'example-sentence': 'After all, he did not come.', 'sentence-jp': '結局、彼は来なかった。' }],
    notes: [],
  },
  '0004': {
    idioms: ['all at once'],
    means: [{ 'idiom-jp': '突然', 'example-sentence': 'All at once, it started to rain.', 'sentence-jp': '突然、雨が降り始めた。' }],
    notes: [],
  },
}
const questionAnswerMap = new Map(
  Object.values(quizDataMap).map((entry) => [entry.idioms[0], entry.means[0]['idiom-jp']]),
)

async function mockBattleAndQuizRequests(page: Parameters<typeof test.beforeEach>[0] extends (args: infer T) => any ? T['page'] : never) {
  await page.route('https://api.github.com/**', async (route) => {
    const url = route.request().url()

    if (url === 'https://api.github.com/repos/jun-shiromizu/english-idiom-target-1000-data/contents/word-target-1900/target') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(quizNumbers.map((number) => ({ name: `${number}.json`, type: 'file' }))),
      })
      return
    }

    await route.fulfill({ status: 404, body: 'not found' })
  })

  await page.route('https://raw.githubusercontent.com/**', async (route) => {
    const url = route.request().url()

    if (url === 'https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/battle/characters.json') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(battleCharacters) })
      return
    }

    if (url === 'https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/battle/dungeons.json') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(battleDungeons) })
      return
    }

    const matchedQuizNumber = quizNumbers.find((number) =>
      url === `https://raw.githubusercontent.com/jun-shiromizu/english-idiom-target-1000-data/main/word-target-1900/target/${number}.json`,
    )
    if (matchedQuizNumber) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(quizDataMap[matchedQuizNumber]) })
      return
    }

    await route.fulfill({ status: 404, body: 'not found' })
  })
}

async function seedBattleSettings(page: Parameters<typeof test.beforeEach>[0] extends (args: infer T) => any ? T['page'] : never) {
  await page.evaluate(() => {
    localStorage.setItem(
      'idiom-app-settings',
      JSON.stringify({
        bookId: 'word-target-1900',
        startNumber: 1,
        endNumber: 4,
        mode: 'idiom',
        direction: 'en-to-ja',
        target: 'all',
        order: 'sequential',
      }),
    )
  })
}

async function clickFirstEnabledMemberAddButton(page: Parameters<typeof test.beforeEach>[0] extends (args: infer T) => any ? T['page'] : never) {
  const buttons = await page.getByRole('button', { name: 'メンバー追加' }).all()

  for (const button of buttons) {
    if (!(await button.isDisabled())) {
      await button.click()
      return
    }
  }

  throw new Error('有効な「メンバー追加」ボタンが見つかりません。')
}

async function seedBattleSession(
  page: Parameters<typeof test.beforeEach>[0] extends (args: infer T) => any ? T['page'] : never,
  session: Record<string, unknown>,
) {
  await page.evaluate((seededSession) => {
    localStorage.setItem('idiom-app-battle-session', JSON.stringify(seededSession))
  }, session)
}

async function getVisibleQuestionText(
  page: Parameters<typeof test.beforeEach>[0] extends (args: infer T) => any ? T['page'] : never,
) {
  for (const questionText of questionAnswerMap.keys()) {
    if (await page.getByText(questionText, { exact: true }).isVisible()) {
      return questionText
    }
  }

  throw new Error('表示中の battle 問題文を特定できません。')
}

async function clickCorrectBattleChoice(
  page: Parameters<typeof test.beforeEach>[0] extends (args: infer T) => any ? T['page'] : never,
) {
  const questionText = await getVisibleQuestionText(page)
  const correctLabel = questionAnswerMap.get(questionText)
  if (!correctLabel) {
    throw new Error(`正解ラベルが見つかりません: ${questionText}`)
  }

  await page.getByRole('button', { name: correctLabel, exact: true }).click()
}

async function clickWrongBattleChoice(
  page: Parameters<typeof test.beforeEach>[0] extends (args: infer T) => any ? T['page'] : never,
) {
  const questionText = await getVisibleQuestionText(page)
  const correctLabel = questionAnswerMap.get(questionText)
  const wrongLabel = [...questionAnswerMap.values()].find((label) => label !== correctLabel)

  if (!wrongLabel) {
    throw new Error('不正解ラベルを作れません。')
  }

  await page.getByRole('button', { name: wrongLabel, exact: true }).click()
}

test.describe('バトルモード - 基本導線', () => {
  test.beforeEach(async ({ page }) => {
    await mockBattleAndQuizRequests(page)
    await page.goto('./', { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.clear())
    await seedBattleSettings(page)
    await page.reload({ waitUntil: 'networkidle' })
  })

  test('BATTLE-001: トップページのバトルボタンからデッキ作成画面へ遷移できる', async ({ page }) => {
    await page.getByRole('button', { name: 'バトル' }).click()

    await expect(page).toHaveURL(/#\/battle\/deck/)
    await expect(page.getByText('デッキ作成')).toBeVisible()
    await expect(page.getByText('現在のデッキ')).toBeVisible()
  })

  test('BATTLE-002: デッキ作成とダンジョン選択を完了するとバトル画面が開始される', async ({ page }) => {
    await page.getByRole('button', { name: 'バトル' }).click()
    await expect(page).toHaveURL(/#\/battle\/deck/)

    await page.getByRole('button', { name: 'リーダーにする' }).first().click()
    for (let index = 0; index < 4; index += 1) {
      await clickFirstEnabledMemberAddButton(page)
    }

    await page.getByRole('button', { name: 'デッキ決定' }).click()
    await expect(page).toHaveURL(/#\/battle\/dungeons/)

    await page.getByRole('button', { name: 'ダンジョン決定' }).click()
    await expect(page).toHaveURL(/#\/battle\/play/)
    await expect(page.getByText('Test Dungeon')).toBeVisible()
    await expect(page.locator('img[alt="Slime icon"]')).toBeVisible()
    await expect(page.getByRole('button', { name: '落ち物ゲームスタート' })).toBeVisible()
  })

  test('BATTLE-003: 保存済みの中断データがある場合はホームからバトルを再開できる', async ({ page }) => {
    await seedBattleSession(page, {
      sessionType: 'battle',
      status: 'in-battle',
      deck: {
        leaderId: 'hero-001',
        memberIds: ['hero-002', 'hero-003', 'hero-004', 'hero-005'],
      },
      dungeonId: 'dungeon-001',
      currentWaveIndex: 0,
      turn: 2,
      score: 110,
      party: battleCharacters.map((character) => ({
        characterId: character.id,
        currentHp: character.hp,
        skillCooldownRemaining: 0,
      })),
      enemyCurrentHp: 120,
      activeEffects: [],
      lastFallingGameScore: 110,
    })
    await page.reload()

    await expect(page.getByText('バトルの中断データがあります')).toBeVisible()
    await page.getByRole('button', { name: '再開する' }).last().click()

    await expect(page).toHaveURL(/#\/battle\/play/)
    await expect(page.getByText('Slime')).toBeVisible()
    await expect(page.getByText('TURN')).toBeVisible()
  })

  test('BATTLE-004: 敵撃破で次 wave の敵へ切り替わる', async ({ page }) => {
    await seedBattleSession(page, {
      sessionType: 'battle',
      status: 'in-battle',
      deck: {
        leaderId: 'hero-001',
        memberIds: ['hero-002', 'hero-003', 'hero-004', 'hero-005'],
      },
      dungeonId: 'dungeon-002',
      currentWaveIndex: 0,
      turn: 1,
      score: 0,
      party: battleCharacters.map((character) => ({
        characterId: character.id,
        currentHp: character.hp,
        skillCooldownRemaining: 0,
      })),
      enemyCurrentHp: 100,
      activeEffects: [],
    })

    await page.goto('./#/battle/play', { waitUntil: 'networkidle' })

    await page.getByRole('button', { name: '落ち物ゲームスタート' }).click()

    await clickCorrectBattleChoice(page)
    await clickWrongBattleChoice(page)

    await expect(page.getByText('Slime を倒した。次は Bat です。')).toBeVisible()
    await expect(page.getByText('Bat', { exact: true })).toBeVisible()
    await expect(page.getByText('2 / 2')).toBeVisible()
  })

  test('BATTLE-005: 敵の反撃で全滅すると敗北画面へ遷移する', async ({ page }) => {
    await seedBattleSession(page, {
      sessionType: 'battle',
      status: 'in-battle',
      deck: {
        leaderId: 'hero-001',
        memberIds: ['hero-002', 'hero-003', 'hero-004', 'hero-005'],
      },
      dungeonId: 'dungeon-003',
      currentWaveIndex: 0,
      turn: 1,
      score: 0,
      party: battleCharacters.map((character) => ({
        characterId: character.id,
        currentHp: 10,
        skillCooldownRemaining: 0,
      })),
      enemyCurrentHp: 500,
      activeEffects: [],
    })

    await page.goto('./#/battle/play', { waitUntil: 'networkidle' })

  await page.getByRole('button', { name: '落ち物ゲームスタート' }).click()

    await clickWrongBattleChoice(page)

    await expect(page).toHaveURL(/#\/battle\/result/)
    await expect(page.getByText('バトル敗北')).toBeVisible()
  })

  test('BATTLE-006: スキル問題に正解すると効果が発動する', async ({ page }) => {
    await seedBattleSession(page, {
      sessionType: 'battle',
      status: 'in-battle',
      deck: {
        leaderId: 'hero-001',
        memberIds: ['hero-002', 'hero-003', 'hero-004', 'hero-005'],
      },
      dungeonId: 'dungeon-001',
      currentWaveIndex: 0,
      turn: 1,
      score: 0,
      party: battleCharacters.map((character) => ({
        characterId: character.id,
        currentHp: character.hp,
        skillCooldownRemaining: 0,
      })),
      enemyCurrentHp: 120,
      activeEffects: [],
    })

    await page.goto('./#/battle/play', { waitUntil: 'networkidle' })

    await page.getByRole('button', { name: 'Member 1 の詳細を開く', exact: true }).click()
    await page.getByRole('button', { name: 'Member Skill 1 を使う', exact: true }).click()
    await clickCorrectBattleChoice(page)

    await expect(page.getByText('Member Skill 1 が発動しました。 ダメージが 0.5 倍になります。')).toBeVisible()
    await expect(page.getByText('被ダメ 0.5倍 (1T)')).toBeVisible()
    await expect(page.getByRole('button', { name: '落ち物ゲームスタート' })).toBeVisible()
  })
})
