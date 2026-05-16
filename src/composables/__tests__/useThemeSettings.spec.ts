import { beforeEach, describe, expect, it, vi } from 'vitest'

import { STORAGE_KEY_THEME } from '@/config'

const mockThemeName = { value: 'classic' }

vi.mock('vuetify', () => ({
  useTheme: () => ({
    global: {
      name: mockThemeName,
    },
  }),
}))

describe('useThemeSettings', () => {
  beforeEach(() => {
    localStorage.clear()
    mockThemeName.value = 'classic'
    vi.resetModules()
  })

  it('保存済みテーマが不正値ならデフォルトテーマにフォールバックする', async () => {
    localStorage.setItem(STORAGE_KEY_THEME, 'invalid-theme')

    const { loadStoredThemeId } = await import('@/theme')

    expect(loadStoredThemeId()).toBe('classic')
  })

  it('テーマを変更すると Vuetify と localStorage の両方に反映される', async () => {
    const { useThemeSettings } = await import('../useThemeSettings')

    const { selectedThemeId, selectedTheme, applyTheme } = useThemeSettings()
    applyTheme('cosmos')

    expect(selectedThemeId.value).toBe('cosmos')
    expect(selectedTheme.value.id).toBe('cosmos')
    expect(mockThemeName.value).toBe('cosmos')
    expect(localStorage.getItem(STORAGE_KEY_THEME)).toBe('cosmos')
  })

  it('テーマカタログが 50 件あり、ダークとモーションを含む', async () => {
    const { APP_THEME_OPTIONS } = await import('@/theme')

    expect(APP_THEME_OPTIONS).toHaveLength(50)
    expect(APP_THEME_OPTIONS.filter((option) => option.isDark).length).toBeGreaterThanOrEqual(18)
    expect(APP_THEME_OPTIONS.filter((option) => option.hasMotion)).toHaveLength(5)
  })
})