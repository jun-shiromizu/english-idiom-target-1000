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
    return JSON.parse(await fetchBattleRaw('characters.json')) as BattleCharacter[]
  }

  async function fetchDungeons(): Promise<BattleDungeon[]> {
    return JSON.parse(await fetchBattleRaw('dungeons.json')) as BattleDungeon[]
  }

  return { listBattleFiles, fetchBattleRaw, fetchCharacters, fetchDungeons }
}