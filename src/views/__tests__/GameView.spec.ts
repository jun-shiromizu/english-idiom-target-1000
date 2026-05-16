import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import GameView from '../GameView.vue'
import type { IdiomData, QuizItem, QuizSession } from '@/types'
import { STORAGE_KEY_GAME_SETTINGS, STORAGE_KEY_SESSION } from '@/config'

const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}))

const vuetify = createVuetify()
let rafCallback: FrameRequestCallback | null = null

// requestAnimationFrame 経由の更新で delta は最大 0.05 秒にクランプされるため、100ms 間隔で進める
const FRAME_DURATION_MS = 100
const MAX_ANIMATION_FRAMES = 160

function makePauseItem(number: string, questionText: string, meaning: string): QuizItem {
  const idiomData: IdiomData = {
    idioms: [questionText],
    means: [{ 'idiom-jp': meaning, 'example-sentence': `${questionText} example`, 'sentence-jp': `${meaning}の例文` }],
    notes: [],
  }

  return {
    number,
    idiomData,
    questionText,
    idiomIndex: 0,
  }
}

function makePauseSession(): QuizSession {
  return {
    settings: {
      bookId: 'idiom-target-1000',
      startNumber: 1,
      endNumber: 4,
      mode: 'idiom',
      target: 'all',
      order: 'sequential',
    },
    items: [
      makePauseItem('0001', 'a piece of ~', '一つの〜'),
      makePauseItem('0002', 'at all costs', 'どんな犠牲を払っても'),
      makePauseItem('0003', 'come up with', '思いつく'),
      makePauseItem('0004', 'in the long run', '結局は'),
    ],
    currentIndex: 0,
    results: {},
  }
}

const gameOverIdiomData: IdiomData = {
  idioms: ['a piece of ~'],
  means: [{ 'idiom-jp': '１つの～', 'example-sentence': 'example', 'sentence-jp': '訳' }],
  notes: [],
}

function makeGameOverItem(number: string): QuizItem {
  return {
    number,
    idiomData: gameOverIdiomData,
    questionText: `question ${number}`,
    idiomIndex: 0,
  }
}

function makeGameOverSession(): QuizSession {
  return {
    settings: {
      bookId: 'idiom-target-1000',
      startNumber: 12,
      endNumber: 34,
      mode: 'sentence',
      target: 'all',
      order: 'sequential',
    },
    items: [makeGameOverItem('0012'), makeGameOverItem('0013'), makeGameOverItem('0014'), makeGameOverItem('0015')],
    currentIndex: 0,
    results: {},
  }
}

describe('GameView', () => {
  beforeEach(() => {
    localStorage.clear()
    mockPush.mockReset()
    mockReplace.mockReset()
    rafCallback = null
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      rafCallback = callback
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  it('一時停止中は問題文と選択肢を非表示にできる', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makePauseSession()))
    const wrapper = mount(GameView, { global: { plugins: [vuetify] } })
    await flushPromises()

    expect(wrapper.text()).toContain('a piece of ~')
    const pauseButton = wrapper.findAll('button').find((button) => button.text().includes('一時停止'))
    expect(pauseButton, '一時停止ボタンが見つかりません').toBeTruthy()
    await pauseButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('一時停止中')
    expect(wrapper.text()).not.toContain('a piece of ~')
    expect(wrapper.findAll('.choice-button')).toHaveLength(0)
  })

  it('一時停止後に再開すると問題表示へ戻る', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makePauseSession()))
    const wrapper = mount(GameView, { global: { plugins: [vuetify] } })
    await flushPromises()

    const pauseButton = wrapper.findAll('button').find((button) => button.text().includes('一時停止'))
    expect(pauseButton, '一時停止ボタンが見つかりません').toBeTruthy()
    await pauseButton!.trigger('click')
    await flushPromises()
    const resumeButton = wrapper.findAll('button').find((button) => button.text().includes('再開'))
    expect(resumeButton, '再開ボタンが見つかりません').toBeTruthy()
    await resumeButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('一時停止中')
    expect(wrapper.text()).toContain('a piece of ~')
    expect(wrapper.findAll('.choice-button').length).toBeGreaterThan(0)
  })

  it('一時停止中はフレーム更新が進まず、再開後に更新が再開される', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makePauseSession()))
    const wrapper = mount(GameView, { global: { plugins: [vuetify] } })
    await flushPromises()
    expect(rafCallback, 'requestAnimationFrame のコールバックが取得できません').toBeTruthy()

    const readFallY = () => {
      const style = wrapper.find('.falling-word').attributes('style')
      const matched = style.match(/translate3d\(0,\s*([\d.]+)px/)
      return matched ? Number(matched[1]) : NaN
    }

    const frameStart = performance.now()
    rafCallback!(frameStart)
    rafCallback!(frameStart + 100)
    await flushPromises()
    const beforePauseY = readFallY()

    const pauseButton = wrapper.findAll('button').find((button) => button.text().includes('一時停止'))
    expect(pauseButton, '一時停止ボタンが見つかりません').toBeTruthy()
    await pauseButton!.trigger('click')
    await flushPromises()

    rafCallback!(frameStart + 5100)
    await flushPromises()

    const resumeButton = wrapper.findAll('button').find((button) => button.text().includes('再開'))
    expect(resumeButton, '再開ボタンが見つかりません').toBeTruthy()
    await resumeButton!.trigger('click')
    await flushPromises()

    const beforeResumeFrameY = readFallY()
    expect(beforeResumeFrameY).toBe(beforePauseY)
    rafCallback!(performance.now() + 16)
    await flushPromises()
    const afterResumeFrameY = readFallY()

    expect(afterResumeFrameY).toBeGreaterThan(beforeResumeFrameY)
    expect(afterResumeFrameY - beforeResumeFrameY).toBeLessThan(2)
  })

  it('ゲーム終了時にモード・単語／熟語・開始／終了の情報を表示する', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeGameOverSession()))
    localStorage.setItem(STORAGE_KEY_GAME_SETTINGS, JSON.stringify({ difficulty: 'hard' }))

    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        rafCallback = callback
        return 1
      })
    const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    const wrapper = mount(GameView, { global: { plugins: [vuetify] } })
    await flushPromises()

    let reachedGameOver = false
    for (let i = 1; i <= MAX_ANIMATION_FRAMES; i += 1) {
      if (!rafCallback) break
      rafCallback(i * FRAME_DURATION_MS)
      await flushPromises()
      if (wrapper.text().includes('ゲームオーバー')) {
        reachedGameOver = true
        break
      }
    }

    expect(reachedGameOver).toBe(true)
    expect(wrapper.text()).toContain('ゲームオーバー')
    expect(wrapper.text()).toContain('モード')
    expect(wrapper.text()).toContain('例文（英語 → 日本語）')
    expect(wrapper.text()).toContain('単語／熟語')
    expect(wrapper.text()).toContain('熟語')
    expect(wrapper.text()).toContain('開始／終了')
    expect(wrapper.text()).toContain('12 〜 34')
    expect(cancelAnimationFrameSpy).toHaveBeenCalled()

    requestAnimationFrameSpy.mockRestore()
    cancelAnimationFrameSpy.mockRestore()
  })

  it('ゲーム終了時に間違えた問題を問題と正解の表で表示する', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makePauseSession()))

    const wrapper = mount(GameView, { global: { plugins: [vuetify] } })
    await flushPromises()
    expect(rafCallback, 'requestAnimationFrame のコールバックが取得できません').toBeTruthy()

    const wrongButton = wrapper.findAll('.choice-button').find((button) => button.text().trim() !== '一つの〜')
    expect(wrongButton, '不正解ボタンが見つかりません').toBeTruthy()
    await wrongButton!.trigger('click')
    await flushPromises()

    let reachedGameOver = false
    for (let i = 1; i <= MAX_ANIMATION_FRAMES; i += 1) {
      if (!rafCallback) break
      rafCallback(i * FRAME_DURATION_MS)
      await flushPromises()
      if (wrapper.text().includes('ゲームオーバー')) {
        reachedGameOver = true
        break
      }
    }

    expect(reachedGameOver).toBe(true)
    expect(wrapper.text()).toContain('間違えた問題')
    expect(wrapper.text()).toContain('問題')
    expect(wrapper.text()).toContain('正解')
    expect(wrapper.text()).toContain('a piece of ~')
    expect(wrapper.text()).toContain('一つの〜')
  })
})
