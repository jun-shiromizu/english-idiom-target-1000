import type {
  BattleCharacter,
  BattleDeck,
  BattleDungeon,
  BattleEffectState,
  BattleSession,
} from '@/types'

function getDeckCharacters(deck: BattleDeck, characters: BattleCharacter[]): BattleCharacter[] {
  const ids = [deck.leaderId, ...deck.memberIds]
  const resolved = ids
    .map((id) => characters.find((character) => character.id === id) ?? null)
    .filter((character): character is BattleCharacter => character !== null)

  if (resolved.length !== ids.length) {
    throw new Error('Battle character data is incomplete for the selected deck.')
  }

  return resolved
}

function createLeaderEffectStates(deck: BattleDeck, characters: BattleCharacter[]): BattleEffectState[] {
  const leader = characters.find((character) => character.id === deck.leaderId)
  if (!leader) {
    throw new Error('Leader character not found.')
  }

  return leader.leaderSkill.effects.map((effect, index) => ({
    sourceId: `${leader.leaderSkill.id}:${index}`,
    effectType: effect.effectType,
    value: effect.value,
    remainingTurns: effect.durationTurns ?? -1,
  }))
}

function getMultiplier(effects: BattleEffectState[], effectType: BattleEffectState['effectType']): number {
  return effects
    .filter((effect) => effect.effectType === effectType)
    .reduce((multiplier, effect) => {
      if (typeof effect.value !== 'number') return multiplier
      return multiplier * effect.value
    }, 1)
}

export function getPartyCurrentHp(session: BattleSession): number {
  return session.party.reduce((total, member) => total + Math.max(0, member.currentHp), 0)
}

export function getCurrentEnemy(session: BattleSession, dungeon: BattleDungeon) {
  return dungeon.enemies[session.currentWaveIndex] ?? null
}

export function getPartyMaxHp(session: BattleSession, characters: BattleCharacter[]): number {
  const hpMultiplier = getMultiplier(session.activeEffects, 'hp-multiplier')
  return getDeckCharacters(session.deck, characters)
    .reduce((total, character) => total + Math.round(character.hp * hpMultiplier), 0)
}

export function getAttackMultiplier(session: BattleSession): number {
  return getMultiplier(session.activeEffects, 'atk-multiplier')
}

export function createInitialBattleSession(
  deck: BattleDeck,
  dungeon: BattleDungeon,
  characters: BattleCharacter[],
): BattleSession {
  if (dungeon.enemies.length === 0) {
    throw new Error('Selected dungeon has no enemies.')
  }

  const resolvedCharacters = getDeckCharacters(deck, characters)
  const activeEffects = createLeaderEffectStates(deck, characters)
  const hpMultiplier = getMultiplier(activeEffects, 'hp-multiplier')

  return {
    sessionType: 'battle',
    status: 'in-battle',
    deck,
    dungeonId: dungeon.id,
    currentWaveIndex: 0,
    turn: 1,
    score: 0,
    party: resolvedCharacters.map((character) => ({
      characterId: character.id,
      currentHp: Math.round(character.hp * hpMultiplier),
      skillCooldownRemaining: character.activeSkill.cooldownTurns,
    })),
    enemyCurrentHp: dungeon.enemies[0].hp,
    activeEffects,
  }
}

export function applyPlayerAttack(
  session: BattleSession,
  dungeon: BattleDungeon,
  baseScore: number,
): BattleSession {
  const currentEnemy = getCurrentEnemy(session, dungeon)
  if (!currentEnemy || session.status !== 'in-battle') {
    return session
  }

  const damage = Math.max(0, Math.round(baseScore * getAttackMultiplier(session)))
  const nextEnemyHp = session.enemyCurrentHp - damage
  const nextScore = session.score + baseScore

  if (nextEnemyHp > 0) {
    return {
      ...session,
      score: nextScore,
      enemyCurrentHp: nextEnemyHp,
    }
  }

  const nextWaveIndex = session.currentWaveIndex + 1
  const nextEnemy = dungeon.enemies[nextWaveIndex]
  if (!nextEnemy) {
    return {
      ...session,
      score: nextScore,
      enemyCurrentHp: 0,
      status: 'cleared',
    }
  }

  return {
    ...session,
    score: nextScore,
    currentWaveIndex: nextWaveIndex,
    enemyCurrentHp: nextEnemy.hp,
  }
}

function getDamageTakenMultiplier(session: BattleSession): number {
  return session.activeEffects
    .filter((effect) => effect.effectType === 'damage-cut')
    .reduce((multiplier, effect) => {
      if (typeof effect.value !== 'number') return multiplier
      return multiplier * effect.value
    }, 1)
}

export function applyEnemyAttack(
  session: BattleSession,
  dungeon: BattleDungeon,
): BattleSession {
  const currentEnemy = getCurrentEnemy(session, dungeon)
  if (!currentEnemy || session.status !== 'in-battle') {
    return session
  }

  let remainingDamage = Math.max(0, Math.round(currentEnemy.atk * getDamageTakenMultiplier(session)))
  const nextParty = session.party.map((member) => {
    if (remainingDamage <= 0 || member.currentHp <= 0) {
      return member
    }

    const damage = Math.min(member.currentHp, remainingDamage)
    remainingDamage -= damage
    return {
      ...member,
      currentHp: member.currentHp - damage,
    }
  })

  const defeated = nextParty.every((member) => member.currentHp <= 0)

  return {
    ...session,
    party: nextParty,
    status: defeated ? 'defeated' : session.status,
  }
}