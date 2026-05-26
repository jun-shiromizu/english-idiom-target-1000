import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { nextTick } from 'vue'
import DictationAnswer from '../DictationAnswer.vue'
import type { QuizItem, IdiomData } from '@/types'

const vuetify = createVuetify()

const mockIdiomData: IdiomData = {
  idioms: ['create'],
  means: [
    {
      'idiom-jp': 'を創り出す',
      'example-sentence': 'Technological change will create new ways of living.',
      'sentence-jp': '技術の変化は新たな生活様式を創り出す。',
    },
  ],
  notes: [],
}

const mockItem: QuizItem = {
  number: '0001',
  idiomData: mockIdiomData,
  mode: 'idiom',
  direction: 'ja-to-en',
  questionText: 'を創り出す',
  idiomIndex: 0,
}

function mountComponent(props: {
  item?: QuizItem
  userInput: string
  isCorrect: boolean
  isLast?: boolean
  attachToBody?: boolean
}) {
  return mount(DictationAnswer, {
    attachTo: props.attachToBody ? document.body : undefined,
    props: {
      item: props.item ?? mockItem,
      userInput: props.userInput,
      isCorrect: props.isCorrect,
      isLast: props.isLast ?? false,
    },
    global: {
      plugins: [vuetify],
      stubs: { SupplementContent: true },
    },
  })
}

describe('DictationAnswer', () => {
  it('正解のとき「正解」と入力した値が表示される', () => {
    const wrapper = mountComponent({ userInput: 'create', isCorrect: true })
    expect(wrapper.text()).toContain('正解')
    expect(wrapper.text()).toContain('create')
  })

  it('不正解のとき「不正解」と入力した値が表示される', () => {
    const wrapper = mountComponent({ userInput: 'creat', isCorrect: false })
    expect(wrapper.text()).toContain('不正解')
    expect(wrapper.text()).toContain('creat')
  })

  it('未入力のとき「（未入力）」が表示される', () => {
    const wrapper = mountComponent({ userInput: '', isCorrect: false })
    expect(wrapper.text()).toContain('（未入力）')
  })

  it('最後の問題でないとき「次の問題へ」ボタンが表示される', () => {
    const wrapper = mountComponent({ userInput: 'create', isCorrect: true, isLast: false })
    expect(wrapper.text()).toContain('次の問題へ')
  })

  it('最後の問題のとき「結果を見る」ボタンが表示される', () => {
    const wrapper = mountComponent({ userInput: 'create', isCorrect: true, isLast: true })
    expect(wrapper.text()).toContain('結果を見る')
  })

  it('「次の問題へ」をクリックすると next イベントを発行する', async () => {
    const wrapper = mountComponent({ userInput: 'create', isCorrect: true })
    const btn = wrapper.findAll('button').find((b) => b.text().includes('次の問題へ'))
    await btn!.trigger('click')
    expect(wrapper.emitted('next')).toBeTruthy()
  })

  it('表示時に「次の問題へ」ボタンへフォーカスが当たる', async () => {
    const wrapper = mountComponent({ userInput: 'create', isCorrect: true, attachToBody: true })
    await nextTick()
    const btn = wrapper.findAll('button').find((b) => b.text().includes('次の問題へ'))
    expect(btn).toBeTruthy()
    expect(document.activeElement).toBe(btn!.element)
    wrapper.unmount()
  })

  it('正解には英単語と意味が表示される', () => {
    const wrapper = mountComponent({ userInput: 'create', isCorrect: true })
    expect(wrapper.text()).toContain('create')
    expect(wrapper.text()).toContain('を創り出す')
  })
})
