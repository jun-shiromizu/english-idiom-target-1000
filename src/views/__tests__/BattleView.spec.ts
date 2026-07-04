import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import BattleView from '../BattleView.vue'
import type { BattleCharacter, BattleDungeon, BattleEffectState, BattleSession, IdiomData, QuizItem } from '@/types'

const {
  mockPush,
  mockReplace,
  mockLoadSession,
  mockSaveSession,
  mockFetchCharacters,
  mockFetchDungeons,
  mockFetchRangeData,
  mockBuildItems,
  mockBuildGameChoices,
  mockGetGameAnswerLabel,
  mockCanUseActiveSkill,
  mockApplyActiveSkill,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockReplace: vi.fn(),
  mockLoadSession: vi.fn(),
  mockSaveSession: vi.fn(),
  mockFetchCharacters: vi.fn(),
  mockFetchDungeons: vi.fn(),
  mockFetchRangeData: vi.fn(),
  mockBuildItems: vi.fn(),
  mockBuildGameChoices: vi.fn(),
  mockGetGameAnswerLabel: vi.fn(),
  mockCanUseActiveSkill: vi.fn(),
  mockApplyActiveSkill: vi.fn((session: BattleSession) => session),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}))

vi.mock('@/composables/useBattleSession', () => ({
  useBattleSession: () => ({
    loadSession: mockLoadSession,
    saveSession: mockSaveSession,
  }),
}))

vi.mock('@/composables/useBattleData', () => ({
  useBattleData: () => ({
    fetchCharacters: mockFetchCharacters,
    fetchDungeons: mockFetchDungeons,
  }),
}))

vi.mock('@/composables/useGitHubData', () => ({
  useGitHubData: () => ({
    fetchRangeData: mockFetchRangeData,
  }),
}))

vi.mock('@/composables/useQuizSession', () => ({
  useQuizSession: () => ({
    buildItems: mockBuildItems,
  }),
}))

vi.mock('@/composables/useGameChoices', () => ({
  useGameChoices: () => ({
    buildGameChoices: mockBuildGameChoices,
  }),
  getGameAnswerLabel: mockGetGameAnswerLabel,
}))

vi.mock('@/composables/useBattleSkills', () => ({
  advanceBattleTurn: vi.fn((session: BattleSession) => session),
  applyActiveSkill: mockApplyActiveSkill,
  canUseActiveSkill: mockCanUseActiveSkill,
}))

const vuetify = createVuetify()

const idiomData: IdiomData = {
  idioms: ['a piece of ~'],
  means: [{ 'idiom-jp': '1つの〜', 'example-sentence': 'example', 'sentence-jp': '訳' }],
  notes: [],
}

const characters: BattleCharacter[] = [
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
  ...Array.from({ length: 4 }, (_, index): BattleCharacter => ({
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

const dungeon: BattleDungeon = {
  id: 'dungeon-001',
  name: 'Test Dungeon',
  enemies: [{ id: 'slime', name: 'Slime', icon: 'battle/icons/enemies/slime.png', atk: 30, hp: 120 }],
}

const waveDungeon: BattleDungeon = {
  id: 'dungeon-002',
  name: 'Wave Dungeon',
  enemies: [
    { id: 'slime', name: 'Slime', icon: 'battle/icons/enemies/slime.png', atk: 30, hp: 100 },
    { id: 'bat', name: 'Bat', icon: 'battle/icons/enemies/bat.png', atk: 40, hp: 220 },
  ],
}

const enduranceDungeon: BattleDungeon = {
  id: 'dungeon-003',
  name: 'Endurance Dungeon',
  enemies: [{ id: 'golem', name: 'Golem', icon: 'battle/icons/enemies/golem.png', atk: 30, hp: 9999 }],
}

const items: QuizItem[] = ['0001', '0002', '0003', '0004'].map((number) => ({
  number,
  idiomData,
  mode: 'idiom',
  direction: 'en-to-ja',
  questionText: `idiom ${number}`,
  idiomIndex: 0,
}))

function createSession(activeEffects: BattleEffectState[] = [
  {
    sourceId: 'leader-1',
    effectType: 'damage-cut',
    value: 0.5,
    remainingTurns: 2,
  },
]): BattleSession {
  return {
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
    party: characters.map((character) => ({
      characterId: character.id,
      currentHp: character.hp,
      skillCooldownRemaining: 0,
    })),
    enemyCurrentHp: 120,
    activeEffects,
  }
}

describe('BattleView', () => {
  beforeEach(() => {
    localStorage.clear()
    mockPush.mockReset()
    mockReplace.mockReset()
    mockLoadSession.mockReset()
    mockSaveSession.mockReset()
    mockFetchCharacters.mockReset()
    mockFetchDungeons.mockReset()
    mockFetchRangeData.mockReset()
    mockBuildItems.mockReset()
    mockBuildGameChoices.mockReset()
    mockGetGameAnswerLabel.mockReset()
    mockCanUseActiveSkill.mockReset()
    mockApplyActiveSkill.mockReset()
    mockApplyActiveSkill.mockImplementation((session: BattleSession) => session)

    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('visualViewport', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      width: 1280,
      height: 720,
      offsetTop: 0,
      offsetLeft: 0,
      pageTop: 0,
      pageLeft: 0,
      scale: 1,
    })
  })

  it('セッションが無ければデッキ編成へリダイレクトする', async () => {
    mockLoadSession.mockReturnValue(null)

    mount(BattleView, { global: { plugins: [vuetify] } })
    await flushPromises()

    expect(mockReplace).toHaveBeenCalledWith({ name: 'battle-deck' })
  })

  it('コマンド画面を表示し、スキルボタン押下で発動チャレンジ状態へ入る', async () => {
    mockLoadSession.mockReturnValue(createSession())
    mockFetchRangeData.mockResolvedValue({ dataMap: new Map([['0001', idiomData]]) })
    mockFetchCharacters.mockResolvedValue(characters)
    mockFetchDungeons.mockResolvedValue([dungeon])
    mockBuildItems.mockReturnValue(items)
    mockBuildGameChoices.mockReturnValue([
      { label: '答え1', correct: true },
      { label: '答え2', correct: false },
      { label: '答え3', correct: false },
      { label: '答え4', correct: false },
    ])
    mockCanUseActiveSkill.mockReturnValue(true)

    const wrapper = mount(BattleView, { global: { plugins: [vuetify] } })
    await flushPromises()

    expect(wrapper.text()).toContain('コマンド画面')
    expect(wrapper.text()).toContain('Slime')
    expect(wrapper.text()).toContain('Leader: Skill 1')
    expect(wrapper.text()).toContain('被ダメ 0.5倍 (2T)')
    expect(wrapper.text()).toContain('落ち物ゲームスタート')
    expect(wrapper.find('img[alt="Slime icon"]').attributes('src')).toContain('/battle/icons/enemies/slime.png')

    const buttons = wrapper.findAll('button')
    const skillButton = buttons.find((button) => button.text().includes('Leader: Skill 1'))
    expect(skillButton).toBeTruthy()

    await skillButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('スキルチャレンジ')
    expect(wrapper.text()).toContain('4択に正解するとスキルが発動します。')
    expect(wrapper.text()).not.toContain('味方パーティ')
    expect(wrapper.find('.play-field-focus img[alt="Leader icon"]').exists()).toBe(true)
    expect(mockSaveSession).toHaveBeenCalledWith(expect.objectContaining({ pendingSkillCharacterId: 'hero-001' }))
  })

  it('スキル成功時に効果ごとの詳細メッセージを表示する', async () => {
    mockLoadSession.mockReturnValue(createSession())
    mockFetchRangeData.mockResolvedValue({ dataMap: new Map([['0001', idiomData]]) })
    mockFetchCharacters.mockResolvedValue(characters)
    mockFetchDungeons.mockResolvedValue([dungeon])
    mockBuildItems.mockReturnValue(items)
    mockBuildGameChoices.mockReturnValue([
      { label: '答え1', correct: true },
      { label: '答え2', correct: false },
      { label: '答え3', correct: false },
      { label: '答え4', correct: false },
    ])
    mockCanUseActiveSkill.mockReturnValue(true)

    const wrapper = mount(BattleView, { global: { plugins: [vuetify] } })
    await flushPromises()

    const skillButton = wrapper.findAll('button').find((button) => button.text().includes('Member 1: Member Skill 1'))
    expect(skillButton).toBeTruthy()

    await skillButton!.trigger('click')
    await flushPromises()

    const correctButton = wrapper.findAll('button').find((button) => button.text().includes('答え1'))
    expect(correctButton).toBeTruthy()

    await correctButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Member Skill 1 が発動しました。 ダメージが 0.5 倍になります。')
  })

  it('未進行の battle session は最新 enemy HP に同期する', async () => {
    mockLoadSession.mockReturnValue({
      ...createSession(),
      enemyCurrentHp: 180,
    })
    mockFetchRangeData.mockResolvedValue({ dataMap: new Map([['0001', idiomData]]) })
    mockFetchCharacters.mockResolvedValue(characters)
    mockFetchDungeons.mockResolvedValue([dungeon])
    mockBuildItems.mockReturnValue(items)
    mockBuildGameChoices.mockReturnValue([
      { label: '答え1', correct: true },
      { label: '答え2', correct: false },
      { label: '答え3', correct: false },
      { label: '答え4', correct: false },
    ])
    mockCanUseActiveSkill.mockReturnValue(true)

    const wrapper = mount(BattleView, { global: { plugins: [vuetify] } })
    await flushPromises()

    expect(wrapper.text()).toContain('HP 120 / 120')
    expect(mockSaveSession).toHaveBeenCalledWith(expect.objectContaining({ enemyCurrentHp: 120 }))
  })

  it('通常攻撃ではコンボに応じた与ダメージを表示し、失敗時にその値でダメージ計算する', async () => {
    const randomSpy = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)

    mockLoadSession.mockReturnValue({
      ...createSession(),
      dungeonId: 'dungeon-003',
      enemyCurrentHp: 9999,
    })
    mockFetchRangeData.mockResolvedValue({ dataMap: new Map([['0001', idiomData]]) })
    mockFetchCharacters.mockResolvedValue(characters)
    mockFetchDungeons.mockResolvedValue([enduranceDungeon])
    mockBuildItems.mockReturnValue(items)
    mockBuildGameChoices
      .mockReturnValueOnce([
        { label: '答え1', correct: true },
        { label: '答え2', correct: false },
        { label: '答え3', correct: false },
        { label: '答え4', correct: false },
      ])
      .mockReturnValueOnce([
        { label: '答え1', correct: false },
        { label: '答え2', correct: true },
        { label: '答え3', correct: false },
        { label: '答え4', correct: false },
      ])
      .mockReturnValue([
        { label: '答え1', correct: true },
        { label: '答え2', correct: false },
        { label: '答え3', correct: false },
        { label: '答え4', correct: false },
      ])
    mockGetGameAnswerLabel.mockReturnValue('正しい答え')
    mockCanUseActiveSkill.mockReturnValue(true)

    const wrapper = mount(BattleView, { global: { plugins: [vuetify] } })
    await flushPromises()

    const startButton = wrapper.findAll('button').find((button) => button.text().includes('落ち物ゲームスタート'))
    expect(startButton).toBeTruthy()

    await startButton!.trigger('click')
    await flushPromises()

    const buttons = wrapper.findAll('button')
    const correctButton = buttons.find((button) => button.text().includes('答え1'))
    expect(correctButton).toBeTruthy()

    await correctButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('現在の与ダメージ')
    expect(wrapper.text()).toContain('462')
    expect(wrapper.text()).toContain('1 コンボ')
    expect(wrapper.text()).toContain('現在 1 コンボ、与ダメージは 462')
    expect(wrapper.text()).toContain('落ち物ゲーム')

    const wrongButton = wrapper.findAll('button').find((button) => button.text().includes('答え1'))
    expect(wrongButton).toBeTruthy()

    await wrongButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('1 コンボの攻撃、Golem に 462 のダメージ。 Golem の反撃、パーティに 15 のダメージ。')
    expect(wrapper.text()).toContain('直前に間違えた問題')
    expect(wrapper.text()).toContain('問題: idiom 0003')
    expect(wrapper.text()).toContain('正しい答え: 正しい答え')
    expect(mockSaveSession).toHaveBeenLastCalledWith(expect.objectContaining({ lastAttackDamage: 462 }))

    randomSpy.mockRestore()
  })

  it('敵を倒したら次の敵に進むメッセージを表示してコマンド画面へ戻る', async () => {
    mockLoadSession.mockReturnValue({
      ...createSession(),
      dungeonId: 'dungeon-002',
      enemyCurrentHp: 100,
    })
    mockFetchRangeData.mockResolvedValue({ dataMap: new Map([['0001', idiomData]]) })
    mockFetchCharacters.mockResolvedValue(characters)
    mockFetchDungeons.mockResolvedValue([waveDungeon])
    mockBuildItems.mockReturnValue(items)
    mockBuildGameChoices
      .mockReturnValueOnce([
        { label: '答え1', correct: true },
        { label: '答え2', correct: false },
        { label: '答え3', correct: false },
        { label: '答え4', correct: false },
      ])
      .mockReturnValueOnce([
        { label: '答え1', correct: false },
        { label: '答え2', correct: true },
        { label: '答え3', correct: false },
        { label: '答え4', correct: false },
      ])
    mockCanUseActiveSkill.mockReturnValue(true)

    const wrapper = mount(BattleView, { global: { plugins: [vuetify] } })
    await flushPromises()

    const startButton = wrapper.findAll('button').find((button) => button.text().includes('落ち物ゲームスタート'))
    expect(startButton).toBeTruthy()

    await startButton!.trigger('click')
    await flushPromises()

    const correctButton = wrapper.findAll('button').find((button) => button.text().includes('答え1'))
    expect(correctButton).toBeTruthy()

    await correctButton!.trigger('click')
    await flushPromises()

    const wrongButton = wrapper.findAll('button').find((button) => button.text().includes('答え1'))
    expect(wrongButton).toBeTruthy()

    await wrongButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('1 コンボの攻撃、Slime に 462 のダメージ。 Slime を倒した。次は Bat です。')
    expect(wrapper.text()).toContain('コマンド画面')
    expect(wrapper.text()).toContain('Bat')
  })

  it('最後の敵を倒したらダンジョンクリア表示に切り替わる', async () => {
    mockLoadSession.mockReturnValue({
      ...createSession(),
      enemyCurrentHp: 100,
      turn: 2,
    })
    mockFetchRangeData.mockResolvedValue({ dataMap: new Map([['0001', idiomData]]) })
    mockFetchCharacters.mockResolvedValue(characters)
    mockFetchDungeons.mockResolvedValue([dungeon])
    mockBuildItems.mockReturnValue(items)
    mockBuildGameChoices
      .mockReturnValueOnce([
        { label: '答え1', correct: true },
        { label: '答え2', correct: false },
        { label: '答え3', correct: false },
        { label: '答え4', correct: false },
      ])
      .mockReturnValueOnce([
        { label: '答え1', correct: false },
        { label: '答え2', correct: true },
        { label: '答え3', correct: false },
        { label: '答え4', correct: false },
      ])
    mockCanUseActiveSkill.mockReturnValue(true)

    const wrapper = mount(BattleView, { global: { plugins: [vuetify] } })
    await flushPromises()

    const startButton = wrapper.findAll('button').find((button) => button.text().includes('落ち物ゲームスタート'))
    expect(startButton).toBeTruthy()

    await startButton!.trigger('click')
    await flushPromises()

    const correctButton = wrapper.findAll('button').find((button) => button.text().includes('答え1'))
    expect(correctButton).toBeTruthy()

    await correctButton!.trigger('click')
    await flushPromises()

    const wrongButton = wrapper.findAll('button').find((button) => button.text().includes('答え1'))
    expect(wrongButton).toBeTruthy()

    await wrongButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('1 コンボの攻撃、Slime に 462 のダメージ。 Slime を倒した。ダンジョンクリアです。')
    expect(wrapper.text()).toContain('ダンジョンクリア')
    expect(wrapper.text()).toContain('バトル結果へ')
  })

  it('game-difficulty 効果があれば現在の落下速度表示に反映する', async () => {
    mockLoadSession.mockReturnValue(createSession([
      {
        sourceId: 'skill-fast',
        effectType: 'game-difficulty',
        value: 10,
        remainingTurns: 2,
      },
    ]))
    mockFetchRangeData.mockResolvedValue({ dataMap: new Map([['0001', idiomData]]) })
    mockFetchCharacters.mockResolvedValue(characters)
    mockFetchDungeons.mockResolvedValue([dungeon])
    mockBuildItems.mockReturnValue(items)
    mockBuildGameChoices.mockReturnValue([
      { label: '答え1', correct: true },
      { label: '答え2', correct: false },
      { label: '答え3', correct: false },
      { label: '答え4', correct: false },
    ])
    mockCanUseActiveSkill.mockReturnValue(true)

    const wrapper = mount(BattleView, { global: { plugins: [vuetify] } })
    await flushPromises()

    const startButton = wrapper.findAll('button').find((button) => button.text().includes('落ち物ゲームスタート'))
    expect(startButton).toBeTruthy()

    await startButton!.trigger('click')
    await flushPromises()

    expect(wrapper.find('.play-field-focus img[alt="Slime icon"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('落下速度 38')
  })

  it('一時停止ボタンで落ち物ゲームを停止し、再開できる', async () => {
    mockLoadSession.mockReturnValue(createSession())
    mockFetchRangeData.mockResolvedValue({ dataMap: new Map([['0001', idiomData]]) })
    mockFetchCharacters.mockResolvedValue(characters)
    mockFetchDungeons.mockResolvedValue([dungeon])
    mockBuildItems.mockReturnValue(items)
    mockBuildGameChoices.mockReturnValue([
      { label: '答え1', correct: true },
      { label: '答え2', correct: false },
      { label: '答え3', correct: false },
      { label: '答え4', correct: false },
    ])
    mockCanUseActiveSkill.mockReturnValue(true)

    const wrapper = mount(BattleView, { global: { plugins: [vuetify] } })
    await flushPromises()

    const startButton = wrapper.findAll('button').find((button) => button.text().includes('落ち物ゲームスタート'))
    expect(startButton).toBeTruthy()

    await startButton!.trigger('click')
    await flushPromises()

    const pauseButton = wrapper.findAll('button').find((button) => button.text().includes('一時停止'))
    expect(pauseButton).toBeTruthy()

    await pauseButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('再開する')

    const resumeButton = wrapper.findAll('button').find((button) => button.text().includes('再開する'))
    expect(resumeButton).toBeTruthy()

    await resumeButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('再開する')
  })

  it('中断ダイアログからトップへ戻ると現在セッションを保存して遷移する', async () => {
    const activeSession = createSession()
    mockLoadSession.mockReturnValue(activeSession)
    mockFetchRangeData.mockResolvedValue({ dataMap: new Map([['0001', idiomData]]) })
    mockFetchCharacters.mockResolvedValue(characters)
    mockFetchDungeons.mockResolvedValue([dungeon])
    mockBuildItems.mockReturnValue(items)
    mockBuildGameChoices.mockReturnValue([
      { label: '答え1', correct: true },
      { label: '答え2', correct: false },
      { label: '答え3', correct: false },
      { label: '答え4', correct: false },
    ])
    mockCanUseActiveSkill.mockReturnValue(true)

    const wrapper = mount(BattleView, { attachTo: document.body, global: { plugins: [vuetify] } })
    await flushPromises()

    const quitButton = wrapper.findAll('button').find((button) => button.text().includes('中断'))
    expect(quitButton).toBeTruthy()

    await quitButton!.trigger('click')
    await flushPromises()

    expect(document.body.textContent ?? '').toContain('バトルを中断しますか？')

    const topButtons = Array.from(document.body.querySelectorAll('button')).filter((button) =>
      button.textContent?.includes('トップへ'),
    )
    expect(topButtons.length).toBeGreaterThan(0)

    ;(topButtons[topButtons.length - 1] as HTMLButtonElement).click()
    await flushPromises()

    expect(mockSaveSession).toHaveBeenCalledWith(activeSession)
    expect(mockPush).toHaveBeenCalledWith({ name: 'home' })

    wrapper.unmount()
  })
})
