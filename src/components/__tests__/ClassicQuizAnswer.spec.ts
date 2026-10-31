import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import ClassicQuizAnswer from '../ClassicQuizAnswer.vue'
import { makeClassicWord } from '@/__tests__/fixtures/classicWords'
import type { ClassicQuizItem, ClassicWordData } from '@/types'

const vuetify = createVuetify()

const wordData: ClassicWordData = makeClassicWord('0007', {
  words: ['見出しA', '<b>見出しB</b>'],
  means: [
    {
      senseNumber: 1,
      meaning: '意味一',
      examples: [
        { text: '例文一の一\n二行目', translation: '訳一の一' },
        { text: '例文一の二', translation: '訳一の二' },
      ],
    },
    { senseNumber: 2, meaning: '意味二', examples: [] },
  ],
  points: ['<script>ポイント</script>'],
  sourcePages: [
    { bookPage: 28, image: '1028.jpg' },
    { bookPage: 29, image: '1029.jpg' },
    { bookPage: 28, image: '1028b.jpg' },
  ],
})

function mountAnswer(item: ClassicQuizItem, data = wordData) {
  return mount(ClassicQuizAnswer, {
    props: { item, wordData: data },
    global: { plugins: [vuetify] },
  })
}

function section(wrapper: ReturnType<typeof mountAnswer>, label: string) {
  return wrapper.find(`section[aria-label="${label}"]`)
}

const idiomItem: ClassicQuizItem = {
  number: '0007',
  mode: 'idiom',
  direction: 'classic-to-modern',
  questionText: '見出しA',
  historyKey: 'key',
  wordIndex: 0,
}

describe('ClassicQuizAnswer', () => {
  it('CJ-07: 見出し語問題では全見出し語・全意味と意味ごとの例文を表示する', () => {
    const wrapper = mountAnswer(idiomItem)

    expect(section(wrapper, '見出し語').text()).toContain('見出しA')
    expect(section(wrapper, '意味').text()).toContain('1. 意味一')
    expect(section(wrapper, '意味').text()).toContain('2. 意味二')
    expect(section(wrapper, '意味').text()).toContain('訳一の二')
    expect(section(wrapper, '例文').exists()).toBe(false)
  })

  it('CJ-08: 例文問題では出題した例文・訳・該当する意味を対応付けて表示する', () => {
    const wrapper = mountAnswer({
      number: '0007',
      mode: 'sentence',
      direction: 'classic-to-modern',
      questionText: '例文一の二',
      historyKey: 'key',
      meanIndex: 0,
      exampleIndex: 1,
    })

    expect(section(wrapper, '例文').text()).toContain('例文一の二')
    expect(section(wrapper, '現代語訳').text()).toContain('訳一の二')
    expect(section(wrapper, '該当する意味').text()).toContain('1. 意味一')
    expect(section(wrapper, '意味').text()).not.toContain('訳一の一')
  })

  it('CJ-10: 文字列をHTMLとして解釈せず、改行を保持し、出典ページを重複なく表示する', () => {
    const wrapper = mountAnswer(idiomItem)

    expect(wrapper.find('b').exists()).toBe(false)
    expect(wrapper.find('script').exists()).toBe(false)
    expect(section(wrapper, '見出し語').text()).toContain('<b>見出しB</b>')
    expect(section(wrapper, 'POINT').text()).toContain('<script>ポイント</script>')
    const exampleText = section(wrapper, '意味')
      .findAll('p')
      .find((paragraph) => paragraph.text().startsWith('例文一の一'))!
    expect(exampleText.element.textContent).toBe('例文一の一\n二行目')
    expect(section(wrapper, '出典ページ').text()).toContain('p.28、p.29')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('CJ-09: POINT・出典ページが空なら欄を表示しない', () => {
    const wrapper = mountAnswer(idiomItem, makeClassicWord('0007', { points: [], sourcePages: [] }))

    expect(section(wrapper, 'POINT').exists()).toBe(false)
    expect(section(wrapper, '出典ページ').exists()).toBe(false)
  })

  it('正誤ボタンで判定を通知する', async () => {
    const wrapper = mountAnswer(idiomItem)
    const buttons = wrapper.findAll('button')

    await buttons.find((button) => button.text().includes('不正解'))!.trigger('click')
    await buttons.find((button) => button.text().includes('正解') && !button.text().includes('不正解'))!.trigger('click')

    expect(wrapper.emitted('incorrect')).toHaveLength(1)
    expect(wrapper.emitted('correct')).toHaveLength(1)
  })
})
