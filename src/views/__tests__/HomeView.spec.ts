import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createVuetify } from 'vuetify'
import HomeView from '../HomeView.vue'
import { STORAGE_KEY_SETTINGS } from '@/config'
import { useAppNotice } from '@/composables/useAppNotice'
import { ClassicDataError } from '@/utils/classicWordData'
import { SessionSaveError } from '@/utils/sessionErrors'
import { INVALID_CLASSIC_SESSION_REDIRECT_NOTICE } from '@/utils/routeGuards'

const mockPush = vi.fn()
const mockFetchRangeData = vi.fn()
const mockFetchClassicRangeData = vi.fn()
const mockBuildItems = vi.fn()
const mockBuildDictationItems = vi.fn()
const mockBuildClozeItems = vi.fn()
const mockBuildClassicItems = vi.fn()
const mockCreateClassicSession = vi.fn()
const mockSaveSession = vi.fn()
const mockLoadStoredSession = vi.fn()
const mockClearSession = vi.fn()
const mockClearAll = vi.fn()
const mockLoadBattleSession = vi.fn()
const mockClearBattleSession = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/composables/useGitHubData', () => ({
  useGitHubData: () => ({
    fetchRangeData: mockFetchRangeData,
    fetchClassicRangeData: mockFetchClassicRangeData,
  }),
}))

vi.mock('@/composables/useQuizSession', () => ({
  useQuizSession: () => ({
    buildItems: mockBuildItems,
    buildDictationItems: mockBuildDictationItems,
    buildClozeItems: mockBuildClozeItems,
    buildClassicItems: mockBuildClassicItems,
    createClassicSession: mockCreateClassicSession,
    saveSession: mockSaveSession,
    loadStoredSession: mockLoadStoredSession,
    clearSession: mockClearSession,
  }),
}))

vi.mock('@/composables/useHistory', () => ({
  useHistory: () => ({ clearAll: mockClearAll }),
}))

vi.mock('@/composables/useBattleSession', () => ({
  useBattleSession: () => ({
    loadSession: mockLoadBattleSession,
    clearSession: mockClearBattleSession,
  }),
}))

const vuetify = createVuetify()

function mountHome() {
  return mount(HomeView, { global: { plugins: [vuetify] } })
}

function radio(wrapper: ReturnType<typeof mountHome>, label: string) {
  return wrapper.get(`input[aria-label="${label}"]`)
}

beforeEach(() => {
  localStorage.clear()
  mockPush.mockReset()
  mockFetchRangeData.mockReset()
  mockFetchClassicRangeData.mockReset()
  mockBuildItems.mockReset()
  mockBuildDictationItems.mockReset()
  mockBuildClozeItems.mockReset()
  mockBuildClassicItems.mockReset()
  mockCreateClassicSession.mockReset()
  mockSaveSession.mockReset()
  mockLoadStoredSession.mockReset()
  mockClearSession.mockReset()
  mockClearAll.mockReset()
  mockLoadBattleSession.mockReset()
  mockClearBattleSession.mockReset()
  mockLoadStoredSession.mockReturnValue({ kind: 'none' })
  mockLoadBattleSession.mockReturnValue(null)
  mockFetchRangeData.mockResolvedValue({ dataMap: new Map() })
  mockFetchClassicRangeData.mockResolvedValue({ dataMap: new Map() })
  mockBuildItems.mockReturnValue([{ number: '0001' }])
  mockBuildDictationItems.mockReturnValue([{ number: '0001' }])
  mockBuildClozeItems.mockReturnValue([{ number: '0001' }])
  mockBuildClassicItems.mockReturnValue([{ number: '0001' }])
  mockCreateClassicSession.mockImplementation((settings, items) => ({
    contentType: 'classic-japanese',
    sessionType: 'quiz',
    settings,
    words: {},
    items,
    currentIndex: 0,
    results: {},
  }))
})

describe('HomeView のアクション制約', () => {
  it('書き取り選択時に教材、形式、方向を対応値へ固定する', async () => {
    const wrapper = mountHome()

    await radio(wrapper, '書き取り').setValue(true)
    await nextTick()

    expect((radio(wrapper, '英単語ターゲット1900').element as HTMLInputElement).checked).toBe(true)
    expect((radio(wrapper, '英熟語ターゲット1000').element as HTMLInputElement).disabled).toBe(true)
    expect((radio(wrapper, '単語／熟語').element as HTMLInputElement).checked).toBe(true)
    expect((radio(wrapper, '例文').element as HTMLInputElement).disabled).toBe(true)
    expect((radio(wrapper, '日本語 → 英語').element as HTMLInputElement).checked).toBe(true)
    expect((radio(wrapper, '英語 → 日本語').element as HTMLInputElement).disabled).toBe(true)
  })

  it('タイピング選択時に例文・英語から日本語へ固定する', async () => {
    const wrapper = mountHome()

    await radio(wrapper, 'タイピング').setValue(true)
    await nextTick()

    expect((radio(wrapper, '例文').element as HTMLInputElement).checked).toBe(true)
    expect((radio(wrapper, '単語／熟語').element as HTMLInputElement).disabled).toBe(true)
    expect((radio(wrapper, '英語 → 日本語').element as HTMLInputElement).checked).toBe(true)
    expect((radio(wrapper, '日本語 → 英語').element as HTMLInputElement).disabled).toBe(true)
  })

  it('開始処理中はアクションを変更できない', async () => {
    mockFetchRangeData.mockReturnValue(new Promise(() => undefined))
    const wrapper = mountHome()
    const startButton = wrapper.findAll('button').find((button) => button.text().trim() === '開始')

    await startButton!.trigger('click')
    await nextTick()

    expect((radio(wrapper, '書き取り').element as HTMLInputElement).disabled).toBe(true)
  })
})

function input(wrapper: ReturnType<typeof mountHome>, label: string) {
  return wrapper.get(`input[aria-label="${label}"]`)
}

function startButton(wrapper: ReturnType<typeof mountHome>) {
  return wrapper.findAll('button').find((button) => button.text().trim() === '開始')!
}

async function selectClassic(wrapper: ReturnType<typeof mountHome>) {
  await radio(wrapper, '古文単語330').setValue(true)
  await nextTick()
}

describe('HomeView の古文単語330', () => {
  it('CJ-01: 教材一覧に古文単語330を追加し、初期教材は英単語ターゲット1900のまま', async () => {
    const wrapper = mountHome()
    await nextTick()

    expect(radio(wrapper, '古文単語330').element).toBeInstanceOf(HTMLInputElement)
    expect((radio(wrapper, '英単語ターゲット1900').element as HTMLInputElement).checked).toBe(true)
  })

  it('CJ-02: 書き取り・日本語→英語から古文へ切り替えると単語帳・古文→現代語へ変更し通知する', async () => {
    const wrapper = mountHome()
    await radio(wrapper, '日本語 → 英語').setValue(true)
    await radio(wrapper, '書き取り').setValue(true)
    await nextTick()

    await selectClassic(wrapper)

    expect((radio(wrapper, '単語帳').element as HTMLInputElement).checked).toBe(true)
    expect((radio(wrapper, '古文 → 現代語').element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.text()).toContain('アクションを単語帳、出題方向を古文 → 現代語に変更しました。')
  })

  it('古文選択中は単語帳以外のアクションと現代語→古文を選択できない', async () => {
    const wrapper = mountHome()
    await selectClassic(wrapper)

    for (const label of ['書き取り', '例文穴埋め', 'タイピング', 'ゲーム', 'バトル']) {
      expect((radio(wrapper, label).element as HTMLInputElement).disabled).toBe(true)
    }
    expect((radio(wrapper, '単語帳').element as HTMLInputElement).disabled).toBe(false)
    expect((radio(wrapper, '現代語 → 古文').element as HTMLInputElement).disabled).toBe(true)
    expect(radio(wrapper, '見出し語').element).toBeInstanceOf(HTMLInputElement)
    expect(wrapper.text()).toContain('古文単語330は単語帳（古文 → 現代語）のみ対応しています。')
  })

  it('古文から英語教材へ戻すと方向を英語→日本語にし、全アクションを選択できる', async () => {
    const wrapper = mountHome()
    await selectClassic(wrapper)

    await radio(wrapper, '英熟語ターゲット1000').setValue(true)
    await nextTick()

    expect((radio(wrapper, '英語 → 日本語').element as HTMLInputElement).checked).toBe(true)
    expect((radio(wrapper, 'ゲーム').element as HTMLInputElement).disabled).toBe(false)
  })

  it('CJ-04: 古文へ切り替えると範囲とランダム出題数を330以下へ補正する', async () => {
    localStorage.setItem(
      STORAGE_KEY_SETTINGS,
      JSON.stringify({
        bookId: 'word-target-1900',
        startNumber: 500,
        endNumber: 1900,
        mode: 'idiom',
        direction: 'en-to-ja',
        target: 'all',
        order: 'random',
        randomQuestionCount: 1000,
      }),
    )
    const wrapper = mountHome()
    await nextTick()

    await selectClassic(wrapper)

    expect((input(wrapper, '開始番号').element as HTMLInputElement).value).toBe('330')
    expect((input(wrapper, '終了番号').element as HTMLInputElement).value).toBe('330')
    expect((input(wrapper, 'ランダム出題数').element as HTMLInputElement).value).toBe('330')
  })

  it.each([
    ['開始番号0', 0, 10],
    ['終了番号331', 1, 331],
    ['小数', 1.5, 10],
    ['範囲逆転', 20, 10],
  ])('CJ-04: 古文で%sは開始できない', async (_label, start, end) => {
    const wrapper = mountHome()
    await selectClassic(wrapper)

    await input(wrapper, '開始番号').setValue(String(start))
    await input(wrapper, '終了番号').setValue(String(end))
    await nextTick()

    expect(startButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('CJ-04: 古文で境界番号1〜330は開始できる', async () => {
    const wrapper = mountHome()
    await selectClassic(wrapper)

    await input(wrapper, '開始番号').setValue('1')
    await input(wrapper, '終了番号').setValue('330')
    await nextTick()

    expect(startButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('古文の開始で古文データを取得し、古文セッションを保存して単語帳へ遷移する', async () => {
    const wrapper = mountHome()
    await selectClassic(wrapper)
    await input(wrapper, '開始番号').setValue('3')
    await input(wrapper, '終了番号').setValue('12')
    await nextTick()

    await startButton(wrapper).trigger('click')
    await flushPromises()

    expect(mockFetchRangeData).not.toHaveBeenCalled()
    expect(mockFetchClassicRangeData).toHaveBeenCalledWith(3, 12)
    expect(mockBuildClassicItems).toHaveBeenCalledWith(
      expect.objectContaining({
        bookId: 'classic-japanese-330',
        startNumber: 3,
        endNumber: 12,
        direction: 'classic-to-modern',
      }),
      expect.any(Map),
    )
    expect(mockSaveSession).toHaveBeenCalledWith(expect.objectContaining({ contentType: 'classic-japanese' }))
    expect(mockPush).toHaveBeenCalledWith({ name: 'quiz' })
  })

  it.each([
    [
      'データ欠落',
      new ClassicDataError('missing', '古文単語330の No.0005 のデータが見つかりません。'),
      '古文単語330の No.0005 のデータが見つかりません。',
    ],
    ['保存容量不足', new SessionSaveError(), '学習データを端末に保存できませんでした。'],
    ['通信失敗', new TypeError('Failed to fetch'), 'データの取得に失敗しました。ネットワーク接続を確認してください。'],
  ])('CJ-06: 古文の開始で%sを区別して通知する', async (_label, error, message) => {
    if (error instanceof SessionSaveError) {
      mockSaveSession.mockImplementation(() => {
        throw error
      })
    } else {
      mockFetchClassicRangeData.mockRejectedValue(error)
    }
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const wrapper = mountHome()
    await selectClassic(wrapper)

    await startButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain(message)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('例文がない範囲と不正解履歴がない場合を区別して通知する', async () => {
    mockBuildClassicItems.mockReturnValue([])
    const wrapper = mountHome()
    await selectClassic(wrapper)
    await radio(wrapper, '例文').setValue(true)
    await nextTick()

    await startButton(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('指定範囲に出題できる例文がありません。')

    mockBuildClassicItems.mockReset()
    mockBuildClassicItems.mockImplementation((settings: { target: string }) =>
      settings.target === 'all' ? [{ number: '0001' }] : [],
    )
    await radio(wrapper, '間違えたものだけ').setValue(true)
    await nextTick()

    await startButton(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('指定範囲に不正解履歴のある問題がありません。')
    expect(mockSaveSession).not.toHaveBeenCalled()
  })

  it('保存済みの古文セッションを古文単語330として再開できる', async () => {
    mockLoadStoredSession.mockReturnValue({
      kind: 'classic',
      session: {
        contentType: 'classic-japanese',
        sessionType: 'quiz',
        settings: { bookId: 'classic-japanese-330' },
        words: {},
        items: [{ number: '0001' }, { number: '0002' }],
        currentIndex: 1,
        results: {},
      },
    })
    const wrapper = mountHome()
    await nextTick()

    expect(wrapper.text()).toContain('古文単語330 / 1 / 2問目')
    await wrapper.findAll('button').find((button) => button.text().includes('再開する'))!.trigger('click')

    expect(mockPush).toHaveBeenCalledWith({ name: 'quiz' })
  })

  it('復元できない古文セッションは理由を表示し、利用者の操作でのみ破棄する', async () => {
    mockLoadStoredSession.mockReturnValue({ kind: 'invalid-classic', reason: '進捗が不正です' })
    const wrapper = mountHome()
    await nextTick()

    expect(wrapper.text()).toContain('保存されている古文単語330の単語帳を再開できません（進捗が不正です）。')
    expect(mockClearSession).not.toHaveBeenCalled()

    await wrapper.findAll('button').find((button) => button.text().includes('破棄する'))!.trigger('click')
    expect(mockClearSession).toHaveBeenCalledTimes(1)
  })

  it('非対応画面から戻された理由を表示する', async () => {
    useAppNotice().setNotice('古文単語330はゲームに対応していないため、トップへ戻りました。')
    const wrapper = mountHome()
    await nextTick()

    expect(wrapper.text()).toContain('古文単語330はゲームに対応していないため、トップへ戻りました。')
  })

  it('復元できない古文セッションで戻された場合も理由は再開不可バナーに1回だけ表示する', async () => {
    mockLoadStoredSession.mockReturnValue({ kind: 'invalid-classic', reason: '進捗が不正です' })
    useAppNotice().setNotice(INVALID_CLASSIC_SESSION_REDIRECT_NOTICE)
    const wrapper = mountHome()
    await nextTick()

    expect(wrapper.text()).toContain(INVALID_CLASSIC_SESSION_REDIRECT_NOTICE)
    expect(wrapper.text().split('進捗が不正です').length - 1).toBe(1)
  })

  it('CJ-14: 古文選択中も保存済みの英語セッションを再開できる', async () => {
    mockLoadStoredSession.mockReturnValue({
      kind: 'english',
      session: {
        sessionType: 'dictation',
        settings: { bookId: 'word-target-1900' },
        items: [{ number: '0001' }],
        currentIndex: 0,
        results: {},
      },
    })
    const wrapper = mountHome()
    await selectClassic(wrapper)

    expect(wrapper.text()).toContain('英単語ターゲット1900 / 0 / 1問目')
    await wrapper.findAll('button').find((button) => button.text().includes('再開する'))!.trigger('click')

    expect(mockPush).toHaveBeenCalledWith({ name: 'dictation' })
  })

  it('古文へ切り替えても直前の英語設定を保持し、英語教材へ戻すと復元できる値を残す', async () => {
    const wrapper = mountHome()
    await radio(wrapper, '英熟語ターゲット1000').setValue(true)
    await input(wrapper, '開始番号').setValue('21')
    await input(wrapper, '終了番号').setValue('40')
    await nextTick()

    await selectClassic(wrapper)

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS) ?? 'null')
    expect(stored.bookId).toBe('classic-japanese-330')
    expect(stored.lastEnglishSettings).toMatchObject({
      bookId: 'idiom-target-1000',
      startNumber: 21,
      endNumber: 40,
    })
  })

  it.each(['0', '1.5'])(
    '番号順へ戻すと、非表示の不正なランダム出題数（%s）をセッションへ保存しない',
    async (randomCount) => {
      const wrapper = mountHome()
      await selectClassic(wrapper)
      await radio(wrapper, 'ランダム').setValue(true)
      await nextTick()
      await input(wrapper, 'ランダム出題数').setValue(randomCount)
      await nextTick()
      expect(startButton(wrapper).attributes('disabled')).toBeDefined()

      await radio(wrapper, '番号順').setValue(true)
      await nextTick()
      await startButton(wrapper).trigger('click')
      await flushPromises()

      const [savedSettings] = mockCreateClassicSession.mock.calls[0]
      expect(savedSettings).toMatchObject({ order: 'sequential' })
      expect(savedSettings.randomQuestionCount).toBeUndefined()
      expect(mockBuildClassicItems.mock.calls[0][0].randomQuestionCount).toBeUndefined()
      expect(mockPush).toHaveBeenCalledWith({ name: 'quiz' })
    },
  )

  it('ランダム順では有効なランダム出題数をセッションへ保存する', async () => {
    const wrapper = mountHome()
    await selectClassic(wrapper)
    await radio(wrapper, 'ランダム').setValue(true)
    await nextTick()
    await input(wrapper, 'ランダム出題数').setValue('20')
    await nextTick()

    await startButton(wrapper).trigger('click')
    await flushPromises()

    expect(mockCreateClassicSession.mock.calls[0][0]).toMatchObject({ order: 'random', randomQuestionCount: 20 })
  })
})

describe('HomeView の開始処理中の中断データ', () => {
  const englishSession = {
    sessionType: 'quiz',
    settings: { bookId: 'word-target-1900' },
    items: [{ number: '0001' }],
    currentIndex: 0,
    results: {},
  }
  const battleSession = {
    sessionType: 'battle',
    status: 'in-battle',
    dungeonId: 'dungeon-1',
    deck: { leaderId: 'a', memberIds: ['b', 'c', 'd', 'e'] },
  }

  function resumeButtons(wrapper: ReturnType<typeof mountHome>) {
    return wrapper.findAll('button').filter((button) => button.text().includes('再開する'))
  }

  it.each(['古文単語330', '英単語ターゲット1900'])(
    '%sの取得中は中断データを再開できず、取得中に画面を離れたら取得完了後に保存・遷移しない',
    async (bookLabel) => {
      let resolveFetch!: (value: { dataMap: Map<string, unknown> }) => void
      const pendingFetch = new Promise<{ dataMap: Map<string, unknown> }>((resolve) => {
        resolveFetch = resolve
      })
      mockFetchClassicRangeData.mockReturnValue(pendingFetch)
      mockFetchRangeData.mockReturnValue(pendingFetch)
      mockLoadStoredSession.mockReturnValue({ kind: 'english', session: englishSession })
      mockLoadBattleSession.mockReturnValue(battleSession)
      const wrapper = mountHome()
      await radio(wrapper, bookLabel).setValue(true)
      await nextTick()

      await startButton(wrapper).trigger('click')
      await nextTick()

      const buttons = resumeButtons(wrapper)
      expect(buttons).toHaveLength(2)
      for (const button of buttons) {
        expect(button.attributes('disabled')).toBeDefined()
        await button.trigger('click')
      }
      expect(mockPush).not.toHaveBeenCalled()

      wrapper.unmount()
      resolveFetch({ dataMap: new Map() })
      await flushPromises()

      expect(mockSaveSession).not.toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    },
  )

  it('取得が完了すると中断データの再開ボタンは再び有効になる', async () => {
    mockBuildClassicItems.mockReturnValue([])
    mockLoadStoredSession.mockReturnValue({ kind: 'english', session: englishSession })
    const wrapper = mountHome()
    await selectClassic(wrapper)

    await startButton(wrapper).trigger('click')
    await flushPromises()

    expect(resumeButtons(wrapper)[0].attributes('disabled')).toBeUndefined()
  })
})
