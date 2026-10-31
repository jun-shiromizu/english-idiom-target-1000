import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import QuizView from '../QuizView.vue'
import type { IdiomData, QuizItem, QuizSession } from '@/types'
import { STORAGE_KEY_SESSION } from '@/config'
import { getClassicWordHistoryKey, useHistory } from '@/composables/useHistory'
import { useAppNotice } from '@/composables/useAppNotice'
import { INVALID_CLASSIC_SESSION_REDIRECT_NOTICE } from '@/utils/routeGuards'
import { makeClassicSession, makeClassicWord } from '@/__tests__/fixtures/classicWords'

const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}))

const vuetify = createVuetify()

const idiomData: IdiomData = {
  idioms: ['stimulate'],
  means: [{
    'idiom-jp': 'を刺激する',
    'example-sentence': 'The new policy stimulates the economy.',
    'sentence-jp': '新しい政策は経済を刺激する。',
  }],
  notes: [],
}

function makeItem(number: string): QuizItem {
  return {
    number,
    idiomData,
    mode: 'idiom',
    direction: 'en-to-ja',
    questionText: 'stimulate',
    idiomIndex: 0,
  }
}

function makeSession(): QuizSession {
  return {
    settings: {
      bookId: 'idiom-target-1000',
      startNumber: 1,
      endNumber: 2,
      mode: 'idiom',
      direction: 'en-to-ja',
      target: 'all',
      order: 'sequential',
    },
    items: [makeItem('0001'), makeItem('0002')],
    currentIndex: 0,
    results: {},
  }
}

type Point = { x: number; y: number }

function touchEvent(type: string, point: Point, ended = false) {
  const touch = { clientX: point.x, clientY: point.y }
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    touches: { value: ended ? [] : [touch] },
    changedTouches: { value: [touch] },
  })
  return event
}

async function swipe(wrapper: VueWrapper, from: Point, to: Point, steps = 10) {
  const zone = wrapper.find('.swipe-zone').element
  zone.dispatchEvent(touchEvent('touchstart', from))
  for (let i = 1; i <= steps; i++) {
    zone.dispatchEvent(touchEvent('touchmove', {
      x: from.x + ((to.x - from.x) * i) / steps,
      y: from.y + ((to.y - from.y) * i) / steps,
    }))
  }
  zone.dispatchEvent(touchEvent('touchend', to, true))
  await flushPromises()
}

async function mountRevealed() {
  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeSession()))
  const wrapper = mount(QuizView, { global: { plugins: [vuetify] } })
  await flushPromises()
  await wrapper.find('[aria-label="タップまたはクリックして回答を表示"]').trigger('click')
  await flushPromises()
  return wrapper
}

function savedResults() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY_SESSION) ?? 'null')?.results
}

describe('QuizView スワイプ判定', () => {
  beforeEach(() => {
    localStorage.clear()
    mockPush.mockClear()
    mockReplace.mockClear()
  })

  it('縦ブレを含む左スワイプで不正解として次の問題へ進む', async () => {
    const wrapper = await mountRevealed()
    await swipe(wrapper, { x: 330, y: 400 }, { x: 90, y: 470 })
    expect(savedResults()).toEqual({ 0: false })
    expect(wrapper.find('.swipe-zone').exists()).toBe(false)
  })

  it('縦ブレを含む右スワイプで正解として記録する', async () => {
    const wrapper = await mountRevealed()
    await swipe(wrapper, { x: 60, y: 450 }, { x: 300, y: 390 })
    expect(savedResults()).toEqual({ 0: true })
  })

  it('縦スクロールでは判定しない', async () => {
    const wrapper = await mountRevealed()
    await swipe(wrapper, { x: 200, y: 600 }, { x: 215, y: 300 })
    expect(savedResults()).toEqual({})
    expect(wrapper.find('.swipe-zone').exists()).toBe(true)
  })

  it('横移動量が閾値未満なら判定しない', async () => {
    const wrapper = await mountRevealed()
    await swipe(wrapper, { x: 200, y: 400 }, { x: 100, y: 410 })
    expect(savedResults()).toEqual({})
    expect(wrapper.find('.swipe-zone').exists()).toBe(true)
  })
})

describe('QuizView の古文単語330', () => {
  const word = makeClassicWord('0001', {
    words: ['見出しA', '見出しB'],
    means: [
      { senseNumber: 1, meaning: '意味一', examples: [] },
      { senseNumber: 2, meaning: '意味二', examples: [] },
    ],
  })

  function makeTwoItemSession() {
    return makeClassicSession({
      words: { '0001': word },
      items: [0, 1].map((wordIndex) => ({
        number: '0001',
        mode: 'idiom' as const,
        direction: 'classic-to-modern' as const,
        questionText: word.words[wordIndex],
        historyKey: getClassicWordHistoryKey(word, wordIndex),
        wordIndex,
      })),
    })
  }

  async function mountClassic() {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(makeTwoItemSession()))
    const wrapper = mount(QuizView, { global: { plugins: [vuetify] } })
    await flushPromises()
    return wrapper
  }

  async function reveal(wrapper: VueWrapper) {
    await wrapper.find('[aria-label="タップまたはクリックして回答を表示"]').trigger('click')
    await flushPromises()
  }

  function judgeButton(wrapper: VueWrapper, label: '正解' | '不正解') {
    return wrapper.findAll('button').find((button) => button.text().trim() === label)!
  }

  beforeEach(() => {
    localStorage.clear()
    mockPush.mockClear()
    mockReplace.mockClear()
    vi.restoreAllMocks()
  })

  it('CJ-07: 意味が複数ある見出し語では回答数を促し、回答で全情報を表示する', async () => {
    const wrapper = await mountClassic()

    expect(wrapper.text()).toContain('見出しA')
    expect(wrapper.text()).toContain('意味を2つ答えてください')

    await reveal(wrapper)
    expect(wrapper.find('section[aria-label="意味"]').text()).toContain('2. 意味二')
  })

  it('CJ-11/CJ-14: 判定で古文の履歴キーへ記録し、進捗を保存する', async () => {
    const wrapper = await mountClassic()
    await reveal(wrapper)

    await judgeButton(wrapper, '不正解').trigger('click')
    await flushPromises()

    expect(useHistory().isClassicIncorrect(getClassicWordHistoryKey(word, 0))).toBe(true)
    expect(savedResults()).toEqual({ 0: false })
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY_SESSION) ?? 'null').currentIndex).toBe(1)
    expect(wrapper.text()).toContain('見出しB')
  })

  it('CJ-16: 古文の回答でも横スワイプで判定できる', async () => {
    const wrapper = await mountClassic()
    await reveal(wrapper)

    await swipe(wrapper, { x: 60, y: 450 }, { x: 300, y: 390 })

    expect(savedResults()).toEqual({ 0: true })
  })

  it('最後の問題を判定すると結果画面へ進む', async () => {
    const session = makeTwoItemSession()
    session.currentIndex = 1
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session))
    const wrapper = mount(QuizView, { global: { plugins: [vuetify] } })
    await flushPromises()
    await reveal(wrapper)

    await judgeButton(wrapper, '正解').trigger('click')

    expect(mockPush).toHaveBeenCalledWith({ name: 'result' })
  })

  it('保存に失敗したら次へ進めず、エラーを表示する', async () => {
    const wrapper = await mountClassic()
    await reveal(wrapper)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === STORAGE_KEY_SESSION) throw new DOMException('quota', 'QuotaExceededError')
      originalSetItem.call(this, key, value)
    })

    await judgeButton(wrapper, '正解').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('回答結果を保存できませんでした。')
    expect(wrapper.find('section[aria-label="見出し語"]').exists()).toBe(true)
    expect(savedResults()).toEqual({})
  })

  it('復元できない古文セッションは保存データを残したままトップへ戻り、理由を重複させずに通知する', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({ ...makeTwoItemSession(), currentIndex: 5 }))
    const storedBefore = localStorage.getItem(STORAGE_KEY_SESSION)
    mount(QuizView, { global: { plugins: [vuetify] } })
    await flushPromises()

    expect(mockReplace).toHaveBeenCalledWith({ name: 'home' })
    const notice = useAppNotice().consumeNotice()
    expect(notice).toBe(INVALID_CLASSIC_SESSION_REDIRECT_NOTICE)
    expect(notice).not.toContain('進捗が不正です')
    expect(localStorage.getItem(STORAGE_KEY_SESSION)).toBe(storedBefore)
  })
})
