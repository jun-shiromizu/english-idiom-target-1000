import { describe, expect, it } from 'vitest'
import {
  ClassicDataError,
  formatNumberList,
  getUniqueBookPages,
  parseClassicWordData,
} from '../classicWordData'
import { makeClassicWord } from '@/__tests__/fixtures/classicWords'

function expectInvalid(value: unknown, expectedPath: string, expectedNumber = '0001') {
  try {
    parseClassicWordData(value, expectedNumber)
  } catch (error) {
    expect(error).toBeInstanceOf(ClassicDataError)
    expect((error as ClassicDataError).kind).toBe('invalid')
    expect((error as ClassicDataError).numbers).toEqual([expectedNumber])
    expect((error as ClassicDataError).message).toContain(`No.${expectedNumber}`)
    expect((error as ClassicDataError).message).toContain(expectedPath)
    return
  }
  throw new Error('ClassicDataError が投げられませんでした')
}

describe('parseClassicWordData', () => {
  it('契約を満たすデータを受け付け、契約外の項目を取り除く', () => {
    const raw = {
      ...makeClassicWord('0001', { points: ['ポイント'] }),
      extra: '<b>不要</b>',
    }

    const parsed = parseClassicWordData(raw, '0001')

    expect(parsed).toEqual(makeClassicWord('0001', { points: ['ポイント'] }))
    expect(parsed).not.toHaveProperty('extra')
  })

  it('CJ-09: 例文・POINT・出典ページが空配列でも受け付ける', () => {
    const raw = makeClassicWord('0002', {
      means: [{ senseNumber: 1, meaning: '意味', examples: [] }],
      points: [],
      sourcePages: [],
    })

    expect(parseClassicWordData(raw, '0002').means[0].examples).toEqual([])
  })

  it('CJ-10: 表示文字列を加工せず、HTML 風の文字列や改行も保持する', () => {
    const raw = makeClassicWord('0003', {
      words: ['<i>見出し</i>'],
      points: ['一行目\n二行目'],
    })

    const parsed = parseClassicWordData(raw, '0003')

    expect(parsed.words[0]).toBe('<i>見出し</i>')
    expect(parsed.points[0]).toBe('一行目\n二行目')
  })

  it.each([
    ['オブジェクト以外', null, '(root)'],
    ['番号不一致', makeClassicWord('0002'), 'number'],
    ['words が空', makeClassicWord('0001', { words: [] }), 'words'],
    ['words に空文字', makeClassicWord('0001', { words: ['  '] }), 'words[0]'],
    ['means が空', makeClassicWord('0001', { means: [] }), 'means'],
    [
      'senseNumber が0',
      makeClassicWord('0001', { means: [{ senseNumber: 0, meaning: '意味', examples: [] }] }),
      'means[0].senseNumber',
    ],
    [
      'senseNumber が重複',
      makeClassicWord('0001', {
        means: [
          { senseNumber: 1, meaning: '意味A', examples: [] },
          { senseNumber: 1, meaning: '意味B', examples: [] },
        ],
      }),
      'means[1].senseNumber',
    ],
    [
      'meaning が空',
      makeClassicWord('0001', { means: [{ senseNumber: 1, meaning: '', examples: [] }] }),
      'means[0].meaning',
    ],
    [
      'examples が配列でない',
      { ...makeClassicWord('0001'), means: [{ senseNumber: 1, meaning: '意味', examples: null }] },
      'means[0].examples',
    ],
    [
      '例文の訳が空',
      makeClassicWord('0001', {
        means: [{ senseNumber: 1, meaning: '意味', examples: [{ text: '例文', translation: '' }] }],
      }),
      'means[0].examples[0].translation',
    ],
    ['points が配列でない', { ...makeClassicWord('0001'), points: 'ポイント' }, 'points'],
    ['points に文字列以外', { ...makeClassicWord('0001'), points: [1] }, 'points[0]'],
    [
      'bookPage が整数でない',
      { ...makeClassicWord('0001'), sourcePages: [{ bookPage: 1.5, image: '1001.jpg' }] },
      'sourcePages[0].bookPage',
    ],
    [
      'image が空',
      { ...makeClassicWord('0001'), sourcePages: [{ bookPage: 1, image: '' }] },
      'sourcePages[0].image',
    ],
  ])('CJ-06: %s は番号と項目を示して不正とする', (_label, value, path) => {
    expectInvalid(value, path)
  })
})

describe('getUniqueBookPages', () => {
  it('同じページを1回だけ配列順に返す', () => {
    const data = makeClassicWord('0001', {
      sourcePages: [
        { bookPage: 29, image: '1029.jpg' },
        { bookPage: 28, image: '1028.jpg' },
        { bookPage: 29, image: '1029b.jpg' },
      ],
    })

    expect(getUniqueBookPages(data)).toEqual([29, 28])
  })
})

describe('formatNumberList', () => {
  it('上限を超える番号は件数で省略する', () => {
    expect(formatNumberList(['0001', '0002'])).toBe('No.0001、No.0002')
    expect(formatNumberList(['0001', '0002', '0003'], 2)).toBe('No.0001、No.0002 ほか1件')
  })
})
