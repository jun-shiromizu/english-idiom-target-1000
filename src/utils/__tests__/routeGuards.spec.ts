import { describe, expect, it } from 'vitest'
import { getClassicRouteBlockMessage } from '../routeGuards'
import { makeClassicSession } from '@/__tests__/fixtures/classicWords'
import type { StoredQuizSessionState } from '@/types'

const classicState: StoredQuizSessionState = { kind: 'classic', session: makeClassicSession() }

describe('getClassicRouteBlockMessage', () => {
  it.each([
    ['game', 'ゲーム'],
    ['dictation', '書き取り'],
    ['cloze', '例文穴埋め'],
    ['typing-race', 'タイピング'],
  ])('古文セッション保存中に %s を開くと理由を返す', (routeName, label) => {
    expect(getClassicRouteBlockMessage(routeName, classicState)).toBe(
      `古文単語330は${label}に対応していないため、トップへ戻りました。保存中の古文単語帳のデータは削除していません。`,
    )
  })

  it('復元できない古文セッションでも英語専用画面を開かせない', () => {
    expect(getClassicRouteBlockMessage('game', { kind: 'invalid-classic', reason: '不正' })).not.toBeNull()
  })

  it('単語帳・結果・トップや英語セッションでは遷移を止めない', () => {
    expect(getClassicRouteBlockMessage('quiz', classicState)).toBeNull()
    expect(getClassicRouteBlockMessage('result', classicState)).toBeNull()
    expect(getClassicRouteBlockMessage(undefined, classicState)).toBeNull()
    expect(getClassicRouteBlockMessage('game', { kind: 'none' })).toBeNull()
  })
})
