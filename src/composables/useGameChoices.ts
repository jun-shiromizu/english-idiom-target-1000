import type { ChoiceType, Mean, QuizItem } from '@/types'

export interface GameChoice {
  label: string
  correct: boolean
}

interface GameChoiceCandidate {
  label: string
  choiceType: ChoiceType
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function simplifyMeaningLabel(label: string): string {
  const withoutHints = label
    .replace(/[（(][^）)]*[A-Za-z⇔⇒→←=][^）)]*[）)]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const [primaryMeaning] = withoutHints.split(/[；;／/]/)
  return primaryMeaning.replace(/[、，,\s]+$/g, '').trim()
}

function inferChoiceType(label: string): ChoiceType {
  if (/^を/.test(label)) return 'transitive-verb'
  if (/^[〜~].*(する|払う|かける|立つ|役立つ|向かう|頼る|関係がある)$/.test(label)) return 'verb-phrase'
  if (/する$/.test(label)) return 'intransitive-verb'
  if (/^[〜~].*(の前|の後|の中|の上|の下|の外|の内|の近く|のそば|のため|の代わり|に関して|について|によって|なしで|に反して)/.test(label)) {
    return 'prepositional-phrase'
  }
  if (/^[〜~].*(するとすぐ|する限り|するために|にもかかわらず|するように|なので)/.test(label)) {
    return 'conjunction-phrase'
  }
  if (/([0-9０-９]|一|二|三|数|たくさん|多く|少し|いくらか).*(の[〜~]?|の)$/.test(label)) {
    return 'quantity-expression'
  }
  if (/より|同じくらい|ほど|むしろ/.test(label)) return 'comparative-expression'
  if (/い$|な$/.test(label)) return 'adjective'
  if (/に$|で$/.test(label)) return 'adverb'
  if (/こと$|もの$|さ$|性$|力$|tion$/.test(label)) return 'noun'
  return 'other'
}

function getMeanChoiceType(mean: Mean): ChoiceType {
  return mean.choiceType ?? inferChoiceType(simplifyMeaningLabel(mean['idiom-jp']))
}

function makeCandidate(mean: Mean): GameChoiceCandidate {
  const label = simplifyMeaningLabel(mean['idiom-jp'])
  return {
    label,
    choiceType: mean.choiceType ?? inferChoiceType(label),
  }
}

export function getGameAnswerLabel(item: QuizItem): string {
  if (item.meanIndex !== undefined) {
    return item.idiomData.means[item.meanIndex]['sentence-jp']
  }

  return simplifyMeaningLabel(item.idiomData.means[0]['idiom-jp'])
}

function getAnswerChoiceType(item: QuizItem): ChoiceType {
  if (item.meanIndex !== undefined) {
    return 'other'
  }

  return getMeanChoiceType(item.idiomData.means[0])
}

function getDistractorCandidates(item: QuizItem): GameChoiceCandidate[] {
  if (item.meanIndex !== undefined) {
    return item.idiomData.means.map((mean) => ({
      label: mean['sentence-jp'],
      choiceType: 'other',
    }))
  }

  return item.idiomData.means.map(makeCandidate)
}

export function buildGameChoices(currentItem: QuizItem, items: QuizItem[]): GameChoice[] {
  const correctAnswer = getGameAnswerLabel(currentItem)
  const correctType = getAnswerChoiceType(currentItem)
  const distractorPool = uniqueCandidates(
    items
      .filter((item) => item !== currentItem)
      .flatMap(getDistractorCandidates)
      .filter((candidate) => candidate.label !== correctAnswer),
  )
  const similarDistractors = distractorPool.filter((candidate) => candidate.choiceType === correctType)
  const otherDistractors = distractorPool.filter((candidate) => candidate.choiceType !== correctType)
  const distractors = [...shuffle(similarDistractors), ...shuffle(otherDistractors)]

  const fallbackDistractors = uniqueCandidates(
    items
      .flatMap((item) => item.idiomData.means.map(makeCandidate))
      .filter((candidate) => candidate.label !== correctAnswer),
  )

  const pickedDistractors = uniqueCandidates([...distractors, ...fallbackDistractors]).slice(0, 3)
  return shuffle([
    { label: correctAnswer, correct: true },
    ...pickedDistractors.map(({ label }) => ({ label, correct: false })),
  ])
}

export function useGameChoices() {
  return { buildGameChoices, getGameAnswerLabel }
}

function uniqueCandidates(candidates: GameChoiceCandidate[]): GameChoiceCandidate[] {
  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    const label = candidate.label.trim()
    if (!label || seen.has(label)) return false
    seen.add(label)
    candidate.label = label
    return true
  })
}
