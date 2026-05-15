import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import QuizAnswer from '../QuizAnswer.vue'
import type { QuizItem, IdiomData } from '@/types'

const vuetify = createVuetify()

const mockData: IdiomData = {
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

function mountComponent(item: QuizItem) {
  return mount(QuizAnswer, {
    props: { item },
    global: {
      plugins: [vuetify],
      stubs: {
        SupplementContent: true,
      },
    },
  })
}

describe('QuizAnswer', () => {
  it('通常表示では固定の共通ラベルを表示する', () => {
    const wrapper = mountComponent({
      number: '0001',
      idiomData: mockData,
      questionText: 'create',
      idiomIndex: 0,
    })

    expect(wrapper.text()).toContain('英単語／英熟語')
    expect(wrapper.text()).not.toContain('熟語\n')
  })

  it('例文表示でも固定の共通ラベルを表示する', () => {
    const wrapper = mountComponent({
      number: '0001',
      idiomData: mockData,
      questionText: mockData.means[0]['example-sentence'],
      idiomIndex: 0,
      meanIndex: 0,
    })

    expect(wrapper.text()).toContain('英単語／英熟語')
    expect(wrapper.text()).not.toContain('熟語\n')
  })
})