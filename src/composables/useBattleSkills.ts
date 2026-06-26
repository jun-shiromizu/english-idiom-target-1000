import type { BattleCharacter, BattleEffectState, BattleSession } from '@/types'

function getCharacter(characters: BattleCharacter[], characterId: string): BattleCharacter {
  const character = characters.find((entry) => entry.id === characterId)
  if (!character) {
    throw new Error(`Battle character not found: ${characterId}`)
  }

  return character
}

function getHpMultiplier(session: BattleSession): number {
  return session.activeEffects
    .filter((effect) => effect.effectType === 'hp-multiplier')
    .reduce((multiplier, effect) => {
      if (typeof effect.value !== 'number') return multiplier
      return multiplier * effect.value
    }, 1)
}

function addTimedEffects(
  session: BattleSession,
  sourceSkillId: string,
  characterId: string,
  effects: BattleCharacter['activeSkill']['effects'],
): BattleEffectState[] {
  const timedEffects = effects
    .filter((effect) => effect.effectType === 'atk-multiplier' || effect.effectType === 'game-difficulty' || effect.effectType === 'damage-cut')
    .map((effect, index) => ({
      sourceId: `${sourceSkillId}:${characterId}:${index}`,
      effectType: effect.effectType,
      value: effect.value,
      remainingTurns: effect.durationTurns ?? 1,
    }))

  return [...session.activeEffects, ...timedEffects]
}

export function canUseActiveSkill(session: BattleSession, characterId: string): boolean {
  const member = session.party.find((entry) => entry.characterId === characterId)
  return Boolean(member && member.currentHp > 0 && member.skillCooldownRemaining <= 0)
}

export function applyActiveSkill(
  session: BattleSession,
  characters: BattleCharacter[],
  characterId: string,
  succeeded: boolean,
): BattleSession {
  const user = getCharacter(characters, characterId)
  const memberIndex = session.party.findIndex((entry) => entry.characterId === characterId)
  if (memberIndex < 0) {
    throw new Error(`Battle party member not found: ${characterId}`)
  }

  const updatedParty = session.party.map((member, index) =>
    index === memberIndex
      ? { ...member, skillCooldownRemaining: user.activeSkill.cooldownTurns }
      : { ...member },
  )

  if (!succeeded) {
    return {
      ...session,
      party: updatedParty,
    }
  }

  let nextSession: BattleSession = {
    ...session,
    party: updatedParty,
    activeEffects: addTimedEffects(session, user.activeSkill.id, characterId, user.activeSkill.effects),
  }

  for (const effect of user.activeSkill.effects) {
    if (effect.effectType === 'heal' && typeof effect.value === 'number') {
      const hpMultiplier = getHpMultiplier(nextSession)
      nextSession = {
        ...nextSession,
        party: nextSession.party.map((member, index) => {
          const character = characters.find((entry) => entry.id === member.characterId)
          if (!character) return member
          const memberMaxHp = Math.round(character.hp * hpMultiplier)
          const healAmount = effect.value > 0 && effect.value <= 1
            ? Math.round(memberMaxHp * effect.value)
            : Math.round(effect.value)
          const nextHp = index === memberIndex
            ? Math.min(memberMaxHp, member.currentHp + healAmount)
            : member.currentHp
          return { ...member, currentHp: nextHp }
        }),
      }
    }

    if (effect.effectType === 'skill-boost' && typeof effect.value === 'number') {
      nextSession = {
        ...nextSession,
        party: nextSession.party.map((member) => ({
          ...member,
          skillCooldownRemaining: Math.max(0, member.skillCooldownRemaining - Math.round(effect.value)),
        })),
      }
    }
  }

  return nextSession
}

export function advanceBattleTurn(session: BattleSession): BattleSession {
  return {
    ...session,
    turn: session.turn + 1,
    activeEffects: session.activeEffects
      .map((effect) => ({
        ...effect,
        remainingTurns: effect.remainingTurns > 0 ? effect.remainingTurns - 1 : effect.remainingTurns,
      }))
      .filter((effect) => effect.remainingTurns !== 0),
    party: session.party.map((member) => ({
      ...member,
      skillCooldownRemaining: Math.max(0, member.skillCooldownRemaining - 1),
    })),
  }
}