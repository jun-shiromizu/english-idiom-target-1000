import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import ClozeQuestion from '../ClozeQuestion.vue'

const vuetify = createVuetify()

function mountComponent(questionText: string) {
  return mount(ClozeQuestion, {
    props: {
      questionText,
      sentenceJp: '技術の変化は新たな生活様式を創り出す。',
      choices: ['create', 'build', 'change', 'shape'],
    },
    global: { plugins: [vuetify] },
    attachTo: document.body,
  })
}

describe('ClozeQuestion', () => {
  it('日本語訳が表示される', () => {
    const wrapper = mountComponent('Technological change will ____ new ways of living.')
    expect(wrapper.text()).toContain('技術の変化は新たな生活様式を創り出す。')
  })

  it('問題文が表示される', () => {
    const wrapper = mountComponent('Technological change will ____ new ways of living.')
    expect(wrapper.text()).toContain('Technological change will ____ new ways of living.')
  })

  it('4択ボタンが表示される', () => {
    const wrapper = mountComponent('Technological change will ____ new ways of living.')
    expect(wrapper.findAll('button')).toHaveLength(4)
  })

  it('選択肢をクリックすると submit イベントとして発行する', async () => {
    const wrapper = mountComponent('Technological change will ____ new ways of living.')
    const button = wrapper.findAll('button').find((candidate) => candidate.text().includes('create'))
    await button!.trigger('click')
    expect(wrapper.emitted('submit')).toBeTruthy()
    expect(wrapper.emitted('submit')![0]).toEqual(['create'])
  })
})
