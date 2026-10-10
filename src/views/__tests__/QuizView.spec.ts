import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import QuizView from '../QuizView.vue'
import QuizQuestion from '@/components/QuizQuestion.vue'
import type { QuizSession } from '@/types'
import { STORAGE_KEY_SESSION } from '@/config'

const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}))

const vuetify = createVuetify()

const session: QuizSession = {
  settings: {
    bookId: 'word-target-1900',
    startNumber: 1,
    endNumber: 2,
    mode: 'idiom',
    direction: 'en-to-ja',
    target: 'all',
    order: 'sequential',
  },
  items: ['first idiom', 'second idiom'].map((questionText, index) => ({
    number: `000${index + 1}`,
    bookId: 'word-target-1900',
    idiomData: {
      idioms: [questionText],
      means: [
        {
          'idiom-jp': '意味',
          'example-sentence': 'Example sentence.',
          'sentence-jp': '例文訳。',
        },
      ],
      notes: [],
    },
    mode: 'idiom',
    direction: 'en-to-ja',
    questionText,
    idiomIndex: 0,
  })),
  currentIndex: 0,
  results: {},
}

function dispatchTouch(
  element: Element,
  eventName: string,
  touches: { clientX: number; clientY: number }[],
  changedTouches = touches,
) {
  const event = new Event(eventName, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    touches: { value: touches },
    changedTouches: { value: changedTouches },
  })
  element.dispatchEvent(event)
}

describe('QuizView', () => {
  beforeEach(() => {
    localStorage.clear()
    mockPush.mockReset()
    mockReplace.mockReset()
  })

  it('斜め気味の左スワイプで不正解として次の問題に進む', async () => {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session))
    const wrapper = mount(QuizView, { global: { plugins: [vuetify] } })
    await flushPromises()
    await wrapper.findComponent(QuizQuestion).trigger('click')

    const swipeZone = wrapper.find('.swipe-zone').element
    dispatchTouch(swipeZone, 'touchstart', [{ clientX: 200, clientY: 300 }])
    dispatchTouch(swipeZone, 'touchend', [], [{ clientX: 100, clientY: 350 }])
    await flushPromises()

    expect(wrapper.text()).toContain('second idiom')
  })
})
