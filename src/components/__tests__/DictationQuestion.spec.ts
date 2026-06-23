import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import DictationQuestion from '../DictationQuestion.vue'

const vuetify = createVuetify()

function mountComponent(questionText: string) {
  return mount(DictationQuestion, {
    props: { questionText },
    global: { plugins: [vuetify] },
    attachTo: document.body,
  })
}

describe('DictationQuestion', () => {
  it('問題文が表示される', () => {
    const wrapper = mountComponent('を創り出す')
    expect(wrapper.text()).toContain('を創り出す')
  })

  it('入力欄が表示される', () => {
    const wrapper = mountComponent('を創り出す')
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('Enter を押すと submit イベントとして発行する', async () => {
    const wrapper = mountComponent('を創り出す')
    const input = wrapper.find('input')
    await input.setValue('create')
    await input.trigger('keydown.enter')
    expect(wrapper.emitted('submit')).toBeTruthy()
    expect(wrapper.emitted('submit')![0]).toEqual(['create'])
  })
})
