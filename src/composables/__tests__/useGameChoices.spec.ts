import { describe, expect, it, vi } from 'vitest'
import type { IdiomData, QuizItem } from '@/types'
import { buildGameChoices, getGameAnswerLabel } from '../useGameChoices'

function data(idiom: string, jp: string, sentenceJp = `${jp}の例文訳`): IdiomData {
  return {
    idioms: [idiom],
    means: [
      {
        'idiom-jp': jp,
        'example-sentence': `${idiom} example.`,
        'sentence-jp': sentenceJp,
      },
    ],
    notes: [],
  }
}

function item(number: string, idiom: string, jp: string): QuizItem {
  return {
    number,
    idiomData: data(idiom, jp),
    questionText: idiom,
    idiomIndex: 0,
  }
}

describe('useGameChoices', () => {
  it('正解1つとダミー3つの4択を作る', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const current = item('0001', 'create', 'を創り出す')
    const choices = buildGameChoices(current, [
      current,
      item('0002', 'increase', '増える'),
      item('0003', 'include', 'を含む'),
      item('0004', 'consider', 'を考慮する'),
    ])

    expect(choices).toHaveLength(4)
    expect(choices.filter((choice) => choice.correct)).toHaveLength(1)
    expect(choices.map((choice) => choice.label)).toContain('を創り出す')

    vi.restoreAllMocks()
  })

  it('例文モードでは例文訳を正解にする', () => {
    const current: QuizItem = {
      ...item('0001', 'create', 'を創り出す'),
      questionText: 'Technological change will create new ways of living.',
      meanIndex: 0,
    }

    expect(getGameAnswerLabel(current)).toBe('を創り出すの例文訳')
  })

  it('ゲーム用の意味は先頭の短い意味だけを使い、英語ヒント入りの注記を除く', () => {
    const create = item('0001', 'create', 'を創り出す；を引き起こす')
    const increase = item('0002', 'increase', '増加する（⇔ decrease ⇒ 223）；を増やす')

    expect(getGameAnswerLabel(create)).toBe('を創り出す')
    expect(getGameAnswerLabel(increase)).toBe('増加する')
  })

  it('ダミー選択肢は正解と近い日本語の型を優先する', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const current = item('0001', 'create', 'を創り出す')
    const choices = buildGameChoices(current, [
      current,
      item('0002', 'include', 'を含む'),
      item('0003', 'consider', 'を考慮する'),
      item('0004', 'change', 'を変える'),
      item('0005', 'increase', '増加'),
      item('0006', 'important', '重要な'),
    ])

    const distractors = choices.filter((choice) => !choice.correct).map((choice) => choice.label)
    expect(distractors.every((label) => label.startsWith('を'))).toBe(true)

    vi.restoreAllMocks()
  })

  it('choiceType がある場合は日本語表記の推定より優先する', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const current = item('0001', 'create', '創造')
    current.idiomData.means[0].choiceType = 'transitive-verb'

    const include = item('0002', 'include', '包含')
    include.idiomData.means[0].choiceType = 'transitive-verb'
    const consider = item('0003', 'consider', '考慮')
    consider.idiomData.means[0].choiceType = 'transitive-verb'
    const change = item('0004', 'change', '変更')
    change.idiomData.means[0].choiceType = 'transitive-verb'

    const choices = buildGameChoices(current, [
      current,
      include,
      consider,
      change,
      item('0005', 'quickly', 'すぐに'),
      item('0006', 'important', '重要な'),
    ])

    const distractors = choices.filter((choice) => !choice.correct).map((choice) => choice.label)
    expect(distractors).toEqual(expect.arrayContaining(['包含', '考慮', '変更']))

    vi.restoreAllMocks()
  })
})
