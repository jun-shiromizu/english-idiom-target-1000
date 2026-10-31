import type { StoredQuizSessionState } from '@/types'

/** 英語教材専用の学習画面と表示名 */
const ENGLISH_ONLY_SESSION_ROUTES: Record<string, string> = {
  game: 'ゲーム',
  dictation: '書き取り',
  cloze: '例文穴埋め',
  'typing-race': 'タイピング',
}

const BATTLE_ROUTES = new Set(['battle-deck', 'battle-dungeons', 'battle-play', 'battle-result'])

export const CLASSIC_NEW_BATTLE_BLOCK_NOTICE =
  '古文単語330はバトルに対応していないため、トップへ戻りました。バトルを始める場合は英語教材を選択してください。'

/**
 * 復元できない古文セッションで単語帳・結果画面からトップへ戻した際の通知。
 * 理由はトップの再開不可バナーに表示するため、ここでは重複して出さない。
 */
export const INVALID_CLASSIC_SESSION_REDIRECT_NOTICE =
  '保存されている古文単語330の単語帳を再開できないため、トップへ戻りました。保存データは削除していません。'

/**
 * 古文セッションが保存されている状態で英語専用画面を開こうとした場合に、
 * 通知文を返す。遷移してよい場合は null。
 */
export function getClassicRouteBlockMessage(
  routeName: unknown,
  storedState: StoredQuizSessionState,
): string | null {
  const label = typeof routeName === 'string' ? ENGLISH_ONLY_SESSION_ROUTES[routeName] : undefined
  if (!label) return null
  if (storedState.kind !== 'classic' && storedState.kind !== 'invalid-classic') return null
  return `古文単語330は${label}に対応していないため、トップへ戻りました。保存中の古文単語帳のデータは削除していません。`
}

/**
 * 古文選択中に、保存済みバトルなしでバトル画面を開こうとした場合（新規開始）に通知文を返す。
 * 保存済みバトルの再開は止めない。遷移してよい場合は null。
 */
export function getClassicBattleBlockMessage(
  routeName: unknown,
  isClassicSelected: boolean,
  hasSavedBattle: boolean,
): string | null {
  if (typeof routeName !== 'string' || !BATTLE_ROUTES.has(routeName)) return null
  if (!isClassicSelected || hasSavedBattle) return null
  return CLASSIC_NEW_BATTLE_BLOCK_NOTICE
}
