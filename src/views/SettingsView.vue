<template>
  <v-container class="py-8" max-width="900">
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">テーマ設定</h1>
        <p class="text-body-2 text-medium-emphasis mt-2">
          配色のみ 20 件、背景演出つき 15 件、アニメーション背景 5 件の合計 40 テーマから選べます。
        </p>
      </div>
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="goHome">
        トップへ戻る
      </v-btn>
    </div>

    <v-card class="mb-6" variant="outlined">
      <v-card-text class="pb-4">
        <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
          <div>
            <div class="text-subtitle-1 font-weight-medium">テーマ一覧</div>
            <div class="text-body-2 text-medium-emphasis">
              {{ filteredThemeOptions.length }} / {{ themeOptions.length }} テーマを表示中
            </div>
          </div>
          <div class="text-body-2 text-medium-emphasis">
            現在: {{ selectedTheme.label }}
          </div>
        </div>

        <v-chip-group v-model="selectedFilter" mandatory selected-class="text-primary">
          <v-chip
            v-for="filter in themeFilters"
            :key="filter.id"
            :value="filter.id"
            filter
            variant="outlined"
            class="mr-2 mb-2"
          >
            {{ filter.label }} ({{ countThemes(filter.id) }})
          </v-chip>
        </v-chip-group>
      </v-card-text>
    </v-card>

    <v-row>
      <v-col
        v-for="option in filteredThemeOptions"
        :key="option.id"
        cols="12"
        md="6"
        lg="4"
        xl="3"
      >
        <v-card
          :class="['fill-height theme-card', { 'theme-card--selected': selectedThemeId === option.id }]"
          variant="outlined"
        >
          <v-card-item>
            <template #prepend>
              <v-icon :icon="selectedThemeId === option.id ? 'mdi-palette' : 'mdi-palette-outline'" />
            </template>
            <v-card-title>{{ option.label }}</v-card-title>
            <v-card-subtitle>
              {{ getCategoryLabel(option.category) }}
            </v-card-subtitle>
          </v-card-item>

          <v-card-text>
            <div
              :class="[
                'theme-preview mb-4',
                {
                  'theme-preview--scenic': option.category === 'scenic',
                  'theme-preview--motion': option.hasMotion,
                  'theme-preview--dark': option.isDark,
                },
              ]"
            >
              <span
                v-for="color in option.previewColors"
                :key="color"
                class="theme-preview__swatch"
                :style="{ backgroundColor: color }"
              />
            </div>
            <div class="theme-meta mb-3">
              <v-chip size="small" variant="outlined">{{ getCategoryLabel(option.category) }}</v-chip>
              <v-chip v-if="option.isDark" size="small" variant="outlined">ダーク</v-chip>
              <v-chip v-if="option.hasMotion" size="small" color="primary" variant="tonal">動く背景</v-chip>
            </div>
            <p class="text-body-2">{{ option.description }}</p>
          </v-card-text>

          <v-card-actions class="px-4 pb-4 pt-0">
            <v-btn
              block
              :variant="selectedThemeId === option.id ? 'elevated' : 'outlined'"
              :color="selectedThemeId === option.id ? 'primary' : undefined"
              @click="applyTheme(option.id)"
            >
              {{ selectedThemeId === option.id ? '使用中のテーマ' : 'このテーマを使う' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useThemeSettings } from '@/composables/useThemeSettings'
import {
  THEME_FILTER_OPTIONS,
  matchesThemeFilter,
  type ThemeFilterId,
} from '@/theme'

const router = useRouter()
const { themeOptions, selectedThemeId, selectedTheme, applyTheme } = useThemeSettings()
const themeFilters = THEME_FILTER_OPTIONS
const selectedFilter = ref<ThemeFilterId>('all')

const filteredThemeOptions = computed(() =>
  themeOptions.filter((option) => matchesThemeFilter(option, selectedFilter.value)),
)

function countThemes(filterId: ThemeFilterId): number {
  return themeOptions.filter((option) => matchesThemeFilter(option, filterId)).length
}

function getCategoryLabel(category: 'color' | 'scenic' | 'motion'): string {
  switch (category) {
    case 'color':
      return '配色のみ'
    case 'scenic':
      return '背景演出あり'
    case 'motion':
      return 'アニメーション背景'
  }
}

function goHome(): void {
  router.push({ name: 'home' })
}
</script>

<style scoped>
.theme-card {
  backdrop-filter: blur(10px);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.theme-card--selected {
  border-color: rgba(var(--v-theme-primary), 0.7);
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.1);
}

.theme-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 78px;
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(47, 93, 168, 0.08), rgba(127, 179, 213, 0.12));
}

.theme-preview--scenic {
  background:
    radial-gradient(circle at top left, rgba(255, 213, 164, 0.8), transparent 35%),
    linear-gradient(135deg, rgba(126, 208, 216, 0.2), rgba(91, 108, 250, 0.18));
}

.theme-preview--motion {
  background:
    radial-gradient(circle at top right, rgba(91, 108, 250, 0.4), transparent 24%),
    linear-gradient(135deg, rgba(167, 228, 248, 0.25), rgba(95, 155, 234, 0.18));
  background-size: 160% 160%;
  animation: previewMotion 7s ease-in-out infinite;
}

.theme-preview--dark {
  background:
    radial-gradient(circle at top right, rgba(122, 156, 235, 0.32), transparent 24%),
    linear-gradient(135deg, rgba(12, 20, 34, 0.96), rgba(27, 36, 54, 0.96));
}

.theme-preview--dark.theme-preview--motion {
  background:
    radial-gradient(circle at top right, rgba(122, 156, 235, 0.34), transparent 24%),
    linear-gradient(135deg, rgba(8, 16, 30, 0.98), rgba(20, 31, 48, 0.98));
}

.theme-preview__swatch {
  width: 22px;
  height: 48px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.78);
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.12);
}

.theme-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@keyframes previewMotion {
  0% {
    background-position: 0% 50%, 0% 50%;
  }
  50% {
    background-position: 100% 40%, 100% 50%;
  }
  100% {
    background-position: 0% 50%, 0% 50%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .theme-card {
    transition: none;
  }

  .theme-preview--motion {
    animation: none;
  }
}
</style>