import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import QuizView from '../QuizView.vue'
import type { IdiomData, QuizItem, QuizSession } from '@/types'
import { STORAGE_KEY_SESSION } from '@/config'

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
