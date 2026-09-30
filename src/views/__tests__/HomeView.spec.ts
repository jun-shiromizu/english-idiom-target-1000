import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createVuetify } from 'vuetify'
import HomeView from '../HomeView.vue'

const mockPush = vi.fn()
const mockFetchRangeData = vi.fn()
const mockBuildItems = vi.fn()
const mockBuildDictationItems = vi.fn()
const mockBuildClozeItems = vi.fn()
const mockSaveSession = vi.fn()
const mockLoadSession = vi.fn()
const mockClearSession = vi.fn()
const mockClearAll = vi.fn()
const mockLoadBattleSession = vi.fn()
const mockClearBattleSession = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/composables/useGitHubData', () => ({
  useGitHubData: () => ({ fetchRangeData: mockFetchRangeData }),
}))

vi.mock('@/composables/useQuizSession', () => ({
  useQuizSession: () => ({
    buildItems: mockBuildItems,
    buildDictationItems: mockBuildDictationItems,
    buildClozeItems: mockBuildClozeItems,
    saveSession: mockSaveSession,
    loadSession: mockLoadSession,
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
  mockBuildItems.mockReset()
  mockBuildDictationItems.mockReset()
  mockBuildClozeItems.mockReset()
  mockSaveSession.mockReset()
  mockLoadSession.mockReset()
  mockClearSession.mockReset()
  mockClearAll.mockReset()
  mockLoadBattleSession.mockReset()
  mockClearBattleSession.mockReset()
  mockLoadSession.mockReturnValue(null)
  mockLoadBattleSession.mockReturnValue(null)
  mockFetchRangeData.mockResolvedValue({ dataMap: new Map() })
  mockBuildItems.mockReturnValue([{ number: '0001' }])
  mockBuildDictationItems.mockReturnValue([{ number: '0001' }])
  mockBuildClozeItems.mockReturnValue([{ number: '0001' }])
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
