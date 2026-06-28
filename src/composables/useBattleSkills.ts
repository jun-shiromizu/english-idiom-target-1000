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

function getMemberMaxHp(
  characters: BattleCharacter[],
  characterId: string,
  hpMultiplier: number,
): number {
  const character = characters.find((entry) => entry.id === characterId)
  return character ? Math.round(character.hp * hpMultiplier) : 0
}

function getPartyMaxHp(
  session: BattleSession,
  characters: BattleCharacter[],
  hpMultiplier: number,
): number {
  return session.party.reduce(
    (total, member) => total + getMemberMaxHp(characters, member.characterId, hpMultiplier),
    0,
  )
}

function applyPartyHeal(
  session: BattleSession,
  characters: BattleCharacter[],
  hpMultiplier: number,
  healAmount: number,
): BattleSession['party'] {
  if (healAmount <= 0) {
    return session.party
  }

  const memberMaxHps = session.party.map((member) => getMemberMaxHp(characters, member.characterId, hpMultiplier))
  const nextParty = session.party.map((member) => ({ ...member }))
  let remainingHeal = healAmount

  while (remainingHeal > 0) {
    const eligibleMembers = nextParty
      .map((member, index) => ({
        index,
        weight: memberMaxHps[index],
        missingHp: Math.max(0, memberMaxHps[index] - member.currentHp),
      }))
      .filter((member) => member.missingHp > 0 && member.weight > 0)

    if (eligibleMembers.length === 0) {
      break
    }

    const totalWeight = eligibleMembers.reduce((sum, member) => sum + member.weight, 0)
    if (totalWeight <= 0) {
      break
    }

    let appliedThisRound = 0
    const fractionalShares = eligibleMembers.map((member) => {
      const rawShare = (remainingHeal * member.weight) / totalWeight
      const appliedHeal = Math.min(member.missingHp, Math.floor(rawShare))
      if (appliedHeal > 0) {
        nextParty[member.index].currentHp += appliedHeal
        appliedThisRound += appliedHeal
      }

      return {
        index: member.index,
        fractional: rawShare - Math.floor(rawShare),
      }
    })

    remainingHeal -= appliedThisRound
    if (remainingHeal <= 0) {
      break
    }

    fractionalShares
      .sort((left, right) => right.fractional - left.fractional || left.index - right.index)
      .forEach((member) => {
        if (remainingHeal <= 0) {
          return
        }

        const missingHp = memberMaxHps[member.index] - nextParty[member.index].currentHp
        if (missingHp <= 0) {
          return
        }

        nextParty[member.index].currentHp += 1
        remainingHeal -= 1
      })

    if (appliedThisRound === 0 && fractionalShares.every((member) => member.fractional === 0)) {
      break
    }
  }

  return nextParty
}

function addTimedEffects(
  session: BattleSession,
  sourceSkillId: string,
  characterId: string,
  effects: BattleCharacter['activeSkill']['effects'],
): BattleEffectState[] {
  const timedEffects = effects
    .filter((effect) =>
      effect.effectType === 'atk-multiplier'
      || effect.effectType === 'combo-constant'
      || effect.effectType === 'game-difficulty'
      || effect.effectType === 'damage-cut',
    )
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
  return Boolean(session.status === 'in-battle' && member && member.skillCooldownRemaining <= 0)
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
      const partyMaxHp = getPartyMaxHp(nextSession, characters, hpMultiplier)
      nextSession = {
        ...nextSession,
        party: applyPartyHeal(
          nextSession,
          characters,
          hpMultiplier,
          effect.value > 0 && effect.value <= 1
            ? Math.round(partyMaxHp * effect.value)
            : Math.round(effect.value),
        ),
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
