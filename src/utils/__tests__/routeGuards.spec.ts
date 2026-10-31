import { describe, expect, it } from 'vitest'
import {
  CLASSIC_NEW_BATTLE_BLOCK_NOTICE,
  getClassicBattleBlockMessage,
  getClassicRouteBlockMessage,
} from '../routeGuards'
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

describe('getClassicBattleBlockMessage', () => {
  it.each(['battle-deck', 'battle-dungeons', 'battle-play', 'battle-result'])(
    '古文選択中に保存済みバトルなしで %s を開くと新規開始を止める',
    (routeName) => {
      expect(getClassicBattleBlockMessage(routeName, true, false)).toBe(CLASSIC_NEW_BATTLE_BLOCK_NOTICE)
    },
  )

  it('古文選択中でも保存済みバトルの再開は止めない', () => {
    expect(getClassicBattleBlockMessage('battle-deck', true, true)).toBeNull()
    expect(getClassicBattleBlockMessage('battle-play', true, true)).toBeNull()
  })

  it('英語教材の選択中やバトル以外の画面では止めない', () => {
    expect(getClassicBattleBlockMessage('battle-deck', false, false)).toBeNull()
    expect(getClassicBattleBlockMessage('quiz', true, false)).toBeNull()
    expect(getClassicBattleBlockMessage(undefined, true, false)).toBeNull()
  })
})
