import { computed, ref } from 'vue'
import { useTheme } from 'vuetify'

import type { ThemeId } from '@/types'
import {
  APP_THEME_OPTIONS,
  getThemeOption,
  loadStoredThemeId,
  saveStoredThemeId,
  type AppThemeOption,
} from '@/theme'

const selectedThemeId = ref<ThemeId>(loadStoredThemeId())

export function useThemeSettings() {
  const theme = useTheme()

  function applyTheme(themeId: ThemeId): void {
    const nextThemeId = getThemeOption(themeId).id
    selectedThemeId.value = nextThemeId
    theme.global.name.value = nextThemeId
    saveStoredThemeId(nextThemeId)
  }

  if (theme.global.name.value !== selectedThemeId.value) {
    theme.global.name.value = selectedThemeId.value
  }

  const selectedTheme = computed<AppThemeOption>(() => getThemeOption(selectedThemeId.value))

  return {
    themeOptions: APP_THEME_OPTIONS,
    selectedThemeId,
    selectedTheme,
    applyTheme,
  }
}