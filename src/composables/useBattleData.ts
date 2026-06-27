import {
  BATTLE_DATA_PATH,
  buildBattleGitHubApiBase,
  buildBattleGitHubRawBase,
} from '@/config'
import type { BattleCharacter, BattleDungeon } from '@/types'

interface GitHubContentItem {
  name: string
  type: string
}

const GITHUB_FETCH_OPTIONS: RequestInit = {
  cache: 'no-store',
}

let battleCharactersCache: BattleCharacter[] | null = null
let battleDungeonsCache: BattleDungeon[] | null = null
let pendingCharactersRequest: Promise<BattleCharacter[]> | null = null
let pendingDungeonsRequest: Promise<BattleDungeon[]> | null = null

export function resetBattleDataCaches(): void {
  battleCharactersCache = null
  battleDungeonsCache = null
  pendingCharactersRequest = null
  pendingDungeonsRequest = null
}

export function useBattleData() {
  async function listBattleFiles(path = ''): Promise<string[]> {
    const apiBase = buildBattleGitHubApiBase()
    const normalizedPath = path ? `${BATTLE_DATA_PATH}/${path}` : BATTLE_DATA_PATH
    const res = await fetch(`${apiBase}/${normalizedPath}`, GITHUB_FETCH_OPTIONS)
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${normalizedPath}`)

    const items: GitHubContentItem[] = await res.json()
    return items.filter((item) => item.type === 'file').map((item) => item.name)
  }

  async function fetchBattleRaw(path: string): Promise<string> {
    const rawBase = buildBattleGitHubRawBase()
    const normalizedPath = `${BATTLE_DATA_PATH}/${path}`
    const res = await fetch(`${rawBase}/${normalizedPath}`, GITHUB_FETCH_OPTIONS)
    if (!res.ok) throw new Error(`GitHub Raw URL error: ${res.status} ${normalizedPath}`)
    return res.text()
  }

  async function fetchCharacters(): Promise<BattleCharacter[]> {
    if (battleCharactersCache) {
      return battleCharactersCache
    }

    if (pendingCharactersRequest) {
      return pendingCharactersRequest
    }

    const request = (async () => {
      const parsed = JSON.parse(await fetchBattleRaw('characters.json')) as BattleCharacter[]
      battleCharactersCache = parsed
      return parsed
    })()

    pendingCharactersRequest = request
    try {
      return await request
    } finally {
      pendingCharactersRequest = null
    }
  }

  async function fetchDungeons(): Promise<BattleDungeon[]> {
    if (battleDungeonsCache) {
      return battleDungeonsCache
    }

    if (pendingDungeonsRequest) {
      return pendingDungeonsRequest
    }

    const request = (async () => {
      const parsed = JSON.parse(await fetchBattleRaw('dungeons.json')) as BattleDungeon[]
      battleDungeonsCache = parsed
      return parsed
    })()

    pendingDungeonsRequest = request
    try {
      return await request
    } finally {
      pendingDungeonsRequest = null
    }
  }

  return { listBattleFiles, fetchBattleRaw, fetchCharacters, fetchDungeons }
}
