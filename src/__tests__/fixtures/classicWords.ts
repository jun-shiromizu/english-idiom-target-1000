import type { ClassicQuizSession, ClassicQuizSettings, ClassicWordData } from '@/types'

/** テスト専用の架空データ。書籍の本文は使わない */
export function makeClassicWord(number = '0001', overrides: Partial<ClassicWordData> = {}): ClassicWordData {
  return {
    number,
    words: [`見出し${number}`],
    means: [
      {
        senseNumber: 1,
        meaning: `意味${number}-1`,
        examples: [{ text: `例文${number}-1-1`, translation: `訳${number}-1-1` }],
      },
    ],
    points: [],
    sourcePages: [{ bookPage: 10, image: '1010.jpg' }],
    ...overrides,
  }
}

export function makeClassicSettings(overrides: Partial<ClassicQuizSettings> = {}): ClassicQuizSettings {
  return {
    bookId: 'classic-japanese-330',
    startNumber: 1,
    endNumber: 10,
    mode: 'idiom',
    direction: 'classic-to-modern',
    target: 'all',
    order: 'sequential',
    randomQuestionCount: 100,
    ...overrides,
  }
}

export function makeClassicSession(overrides: Partial<ClassicQuizSession> = {}): ClassicQuizSession {
  const word = makeClassicWord('0001')
  return {
    contentType: 'classic-japanese',
    sessionType: 'quiz',
    settings: makeClassicSettings(),
    words: { '0001': word },
    items: [
      {
        number: '0001',
        mode: 'idiom',
        direction: 'classic-to-modern',
        questionText: word.words[0],
        historyKey: 'history-key-0001',
        wordIndex: 0,
      },
    ],
    currentIndex: 0,
    results: {},
    ...overrides,
  }
}
