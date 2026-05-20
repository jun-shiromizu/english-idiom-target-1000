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
    mode: 'idiom',
    direction: 'en-to-ja',
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
      direction: 'en-to-ja',
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
    mode: 'sentence',
    direction: 'en-to-ja',
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
      direction: 'en-to-ja',
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

  it('ゲーム終了時に設定情報とゲーム難易度を表示する', async () => {
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
    expect(wrapper.text()).toContain('教材')
    expect(wrapper.text()).toContain('英熟語ターゲット1000')
    expect(wrapper.text()).toContain('開始番号')
    expect(wrapper.text()).toContain('12')
    expect(wrapper.text()).toContain('終了番号')
    expect(wrapper.text()).toContain('34')
    expect(wrapper.text()).toContain('出題形式')
    expect(wrapper.text()).toContain('例文')
    expect(wrapper.text()).toContain('出題方向')
    expect(wrapper.text()).toContain('英語 → 日本語')
    expect(wrapper.text()).toContain('出題対象')
    expect(wrapper.text()).toContain('すべて')
    expect(wrapper.text()).toContain('出題順序')
    expect(wrapper.text()).toContain('番号順')
    expect(wrapper.text()).toContain('ゲーム難易度')
    expect(wrapper.text()).toContain('ハード')
    expect(cancelAnimationFrameSpy).toHaveBeenCalled()

    requestAnimationFrameSpy.mockRestore()
    cancelAnimationFrameSpy.mockRestore()
  })

  describe('間違えた問題テーブル', () => {
    // Item 1 の正解は simplifyMeaningLabel('一つの〜') = '一つの〜'
    // Item 2 がダミー選択肢を供給する (simplifyMeaningLabel('別の何か') = '別の何か')
    // → 2アイテム以上で buildGameChoices が wrong choices を生成できる
    const ITEM1_CORRECT_ANSWER = '一つの〜'
    const ITEM2_CORRECT_ANSWER = '別の何か'
    const ITEM1_NUMBER = '0099'

    function makeWrongAnswerSession(): QuizSession {
      const item1: QuizItem = {
        number: ITEM1_NUMBER,
        idiomData: {
          idioms: ['a piece of cake'],
          means: [
            {
              'idiom-jp': ITEM1_CORRECT_ANSWER,
              'example-sentence': 'This is a piece of cake.',
              'sentence-jp': 'これは簡単なことだ。',
            },
          ],
          notes: [],
        },
        mode: 'idiom',
        direction: 'en-to-ja',
        questionText: 'a piece of cake',
        idiomIndex: 0,
      }
      const item2: QuizItem = {
        number: '0100',
        idiomData: {
          idioms: ['at all costs'],
          means: [
            {
              'idiom-jp': '別の何か',
              'example-sentence': 'example',
              'sentence-jp': '別の何かの訳。',
            },
          ],
          notes: [],
        },
        mode: 'idiom',
        direction: 'en-to-ja',
        questionText: 'at all costs',
        idiomIndex: 0,
      }
      return {
        settings: {
          bookId: 'idiom-target-1000',
          startNumber: 99,
          endNumber: 100,
          mode: 'idiom',
          direction: 'en-to-ja',
          target: 'all',
          order: 'sequential',
        },
        items: [item1, item2],
        currentIndex: 0,
        results: {},
      }
    }

    async function clickWrongAnswer(wrapper: ReturnType<typeof mount>) {
      const wrongBtn = wrapper
        .findAll('button')
        .find((btn) => btn.text().trim() === ITEM2_CORRECT_ANSWER && !btn.attributes('disabled'))
      if (wrongBtn) {
        await wrongBtn.trigger('click')
        await flushPromises()
      }
    }

    async function reachGameOverByWrongAnswers(wrapper: ReturnType<typeof mount>) {
      // easy モード: missDrop=58, maxFallY=252, START_FALL_Y=24 → 4回で超過
      for (let i = 0; i < 4; i++) {
        await clickWrongAnswer(wrapper)
        if (wrapper.text().includes('ゲームオーバー') || wrapper.text().includes('ゲームクリア')) break
      }
    }

    it('間違えた問題が完了画面の表に表示される', async () => {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeWrongAnswerSession()))
      localStorage.setItem(STORAGE_KEY_GAME_SETTINGS, JSON.stringify({ difficulty: 'easy' }))
      const wrapper = mount(GameView, { global: { plugins: [vuetify] } })
      await flushPromises()

      await reachGameOverByWrongAnswers(wrapper)

      expect(wrapper.text()).toMatch(/ゲームオーバー|ゲームクリア/)
      expect(wrapper.text()).toContain('間違えた問題')
      expect(wrapper.text()).toContain('a piece of cake')
      expect(wrapper.text()).toContain(ITEM1_NUMBER)
      expect(wrapper.text()).toContain(ITEM1_CORRECT_ANSWER)
    })

    it('正解のみの場合は間違えた問題テーブルを表示しない', async () => {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeWrongAnswerSession()))
      localStorage.setItem(STORAGE_KEY_GAME_SETTINGS, JSON.stringify({ difficulty: 'hard' }))
      const wrapper = mount(GameView, { global: { plugins: [vuetify] } })
      await flushPromises()

      // 一度も回答せずアニメーションでゲームオーバーにする（wrong answer なし）
      let reachedGameOver = false
      for (let i = 1; i <= MAX_ANIMATION_FRAMES; i++) {
        if (!rafCallback) break
        rafCallback(i * FRAME_DURATION_MS)
        await flushPromises()
        if (wrapper.text().includes('ゲームオーバー') || wrapper.text().includes('ゲームクリア')) {
          reachedGameOver = true
          break
        }
      }

      expect(reachedGameOver).toBe(true)
      expect(wrapper.text()).not.toContain('間違えた問題')
    })

    it('リスタート後は間違えた問題テーブルがリセットされる', async () => {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeWrongAnswerSession()))
      localStorage.setItem(STORAGE_KEY_GAME_SETTINGS, JSON.stringify({ difficulty: 'easy' }))
      const wrapper = mount(GameView, { global: { plugins: [vuetify] } })
      await flushPromises()

      await reachGameOverByWrongAnswers(wrapper)
      expect(wrapper.text()).toContain('間違えた問題')

      const retryBtn = wrapper.findAll('button').find((btn) => btn.text().includes('もう一度'))
      expect(retryBtn, 'もう一度ボタンが見つかりません').toBeTruthy()
      await retryBtn!.trigger('click')
      await flushPromises()

      expect(wrapper.text()).not.toContain('間違えた問題')
    })
  })
})
