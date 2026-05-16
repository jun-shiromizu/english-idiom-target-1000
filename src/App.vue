<template>
  <v-app
    :class="appThemeClasses"
    :data-theme-id="selectedTheme.id"
    :data-theme-category="selectedTheme.category"
    :data-theme-tone="selectedTheme.isDark ? 'dark' : 'light'"
  >
    <v-main>
      <RouterView />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'

import { useThemeSettings } from '@/composables/useThemeSettings'

const { selectedTheme } = useThemeSettings()
const appThemeClasses = computed(() => [selectedTheme.value.appClass].filter(Boolean))
</script>

<style>
.v-application {
  background-color: rgb(var(--v-theme-background));
  transition: background 0.35s ease, color 0.35s ease;
}

.v-application .v-main {
  transition: background 0.35s ease;
}

.v-application[class*='app-theme-effect-'],
.v-application[class*='app-theme-motion-'] {
  background-attachment: fixed;
  background-size: cover;
}

.v-application[class*='app-theme-effect-'] .v-main,
.v-application[class*='app-theme-motion-'] .v-main {
  background: transparent;
}

.v-application.app-theme-effect-sunrise {
  background:
    radial-gradient(circle at 14% 16%, rgba(255, 214, 152, 0.58), transparent 27%),
    radial-gradient(circle at 86% 10%, rgba(231, 118, 82, 0.24), transparent 22%),
    linear-gradient(180deg, rgba(255, 245, 232, 0.98) 0%, rgba(255, 250, 244, 0.99) 54%, rgba(255, 255, 255, 1) 100%);
}

.v-application.app-theme-effect-cosmos {
  background:
    radial-gradient(circle at 14% 20%, rgba(111, 138, 255, 0.26), transparent 24%),
    radial-gradient(circle at 78% 8%, rgba(56, 96, 185, 0.24), transparent 20%),
    linear-gradient(180deg, rgba(234, 241, 255, 0.99) 0%, rgba(243, 247, 255, 1) 48%, rgba(252, 253, 255, 1) 100%);
}

.v-application.app-theme-effect-lagoon {
  background:
    radial-gradient(circle at 18% 18%, rgba(126, 219, 228, 0.35), transparent 25%),
    radial-gradient(circle at 82% 12%, rgba(71, 163, 189, 0.16), transparent 22%),
    linear-gradient(180deg, rgba(239, 251, 252, 0.98) 0%, rgba(248, 253, 253, 1) 56%, rgba(255, 255, 255, 1) 100%);
}

.v-application.app-theme-effect-forest {
  background:
    radial-gradient(circle at 18% 12%, rgba(147, 194, 129, 0.24), transparent 24%),
    radial-gradient(circle at 78% 18%, rgba(84, 121, 91, 0.18), transparent 18%),
    linear-gradient(180deg, rgba(243, 249, 242, 0.98) 0%, rgba(250, 252, 249, 1) 58%, rgba(255, 255, 255, 1) 100%);
}

.v-application.app-theme-effect-desert {
  background:
    radial-gradient(circle at 15% 15%, rgba(235, 197, 125, 0.35), transparent 22%),
    radial-gradient(circle at 83% 14%, rgba(201, 120, 65, 0.16), transparent 20%),
    linear-gradient(180deg, rgba(252, 243, 231, 0.98) 0%, rgba(255, 248, 240, 1) 54%, rgba(255, 255, 255, 1) 100%);
}

.v-application.app-theme-effect-frost {
  background:
    radial-gradient(circle at 22% 10%, rgba(189, 224, 255, 0.3), transparent 21%),
    radial-gradient(circle at 78% 20%, rgba(215, 241, 239, 0.34), transparent 25%),
    linear-gradient(180deg, rgba(243, 250, 255, 0.99) 0%, rgba(248, 252, 253, 1) 56%, rgba(255, 255, 255, 1) 100%);
}

.v-application.app-theme-effect-paper {
  background:
    linear-gradient(140deg, rgba(250, 244, 236, 0.92) 0%, rgba(255, 251, 246, 0.96) 42%, rgba(247, 239, 228, 0.9) 100%),
    repeating-linear-gradient(0deg, rgba(156, 109, 76, 0.03) 0 2px, transparent 2px 18px);
}

.v-application.app-theme-effect-midnight {
  background:
    radial-gradient(circle at 18% 12%, rgba(130, 111, 188, 0.24), transparent 21%),
    radial-gradient(circle at 82% 18%, rgba(255, 171, 210, 0.14), transparent 18%),
    linear-gradient(180deg, rgba(11, 18, 34, 0.98) 0%, rgba(22, 20, 38, 1) 58%, rgba(29, 24, 43, 1) 100%);
}

.v-application.app-theme-effect-festival {
  background:
    radial-gradient(circle at 18% 16%, rgba(240, 165, 230, 0.28), transparent 22%),
    radial-gradient(circle at 78% 8%, rgba(255, 224, 125, 0.22), transparent 16%),
    radial-gradient(circle at 56% 20%, rgba(140, 167, 255, 0.16), transparent 18%),
    linear-gradient(180deg, rgba(253, 246, 255, 0.98) 0%, rgba(255, 251, 255, 1) 56%, rgba(255, 255, 255, 1) 100%);
}

.v-application.app-theme-motion-wave {
  background:
    radial-gradient(circle at 18% 22%, rgba(122, 208, 216, 0.34), transparent 22%),
    radial-gradient(circle at 82% 14%, rgba(94, 155, 234, 0.2), transparent 20%),
    linear-gradient(120deg, rgba(241, 251, 252, 1), rgba(228, 246, 249, 0.98), rgba(255, 255, 255, 1));
  background-size: 180% 180%;
  animation: themeWave 18s ease-in-out infinite;
}

.v-application.app-theme-motion-drift {
  background:
    radial-gradient(circle at 12% 18%, rgba(255, 211, 138, 0.38), transparent 22%),
    radial-gradient(circle at 82% 16%, rgba(233, 139, 85, 0.2), transparent 18%),
    linear-gradient(135deg, rgba(255, 248, 239, 1), rgba(255, 241, 224, 0.98), rgba(255, 255, 255, 1));
  background-size: 170% 170%;
  animation: themeDrift 16s ease-in-out infinite;
}

.v-application.app-theme-motion-orbit {
  background:
    radial-gradient(circle at 20% 18%, rgba(138, 162, 255, 0.28), transparent 18%),
    radial-gradient(circle at 75% 22%, rgba(115, 199, 234, 0.16), transparent 16%),
    linear-gradient(180deg, rgba(8, 16, 30, 0.99), rgba(14, 25, 48, 1), rgba(18, 29, 52, 1));
  background-size: 160% 160%;
  animation: themeOrbit 22s linear infinite;
}

.v-application.app-theme-motion-rain {
  background:
    linear-gradient(160deg, rgba(7, 19, 28, 0.98), rgba(16, 33, 50, 1)),
    repeating-linear-gradient(110deg, rgba(36, 213, 255, 0.18) 0 2px, transparent 2px 18px),
    repeating-linear-gradient(100deg, rgba(126, 124, 255, 0.1) 0 1px, transparent 1px 16px);
  background-size: auto, 220% 220%, 180% 180%;
  animation: themeRain 13s linear infinite;
}

.v-application.app-theme-motion-pulse {
  background:
    radial-gradient(circle at 18% 18%, rgba(167, 228, 248, 0.42), transparent 20%),
    radial-gradient(circle at 76% 16%, rgba(95, 155, 234, 0.18), transparent 18%),
    linear-gradient(135deg, rgba(242, 251, 255, 1), rgba(233, 247, 253, 0.98), rgba(255, 255, 255, 1));
  background-size: 170% 170%;
  animation: themePulse 15s ease-in-out infinite;
}

@keyframes themeWave {
  0% {
    background-position: 0% 50%, 100% 50%, 0% 50%;
  }
  50% {
    background-position: 100% 35%, 0% 65%, 100% 50%;
  }
  100% {
    background-position: 0% 50%, 100% 50%, 0% 50%;
  }
}

@keyframes themeDrift {
  0% {
    background-position: 0% 20%, 100% 20%, 0% 50%;
  }
  50% {
    background-position: 70% 60%, 20% 30%, 100% 50%;
  }
  100% {
    background-position: 0% 20%, 100% 20%, 0% 50%;
  }
}

@keyframes themeOrbit {
  0% {
    background-position: 20% 18%, 75% 22%, 50% 50%;
  }
  50% {
    background-position: 80% 20%, 15% 30%, 50% 50%;
  }
  100% {
    background-position: 20% 18%, 75% 22%, 50% 50%;
  }
}

@keyframes themeRain {
  0% {
    background-position: 0 0, 0 0, 0 0;
  }
  100% {
    background-position: 0 0, -220px 260px, 190px 320px;
  }
}

@keyframes themePulse {
  0% {
    background-position: 18% 18%, 76% 16%, 0% 50%;
    background-size: 170% 170%;
  }
  50% {
    background-position: 28% 22%, 66% 18%, 100% 50%;
    background-size: 190% 190%;
  }
  100% {
    background-position: 18% 18%, 76% 16%, 0% 50%;
    background-size: 170% 170%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .v-application {
    transition: none;
  }

  .v-application[class*='app-theme-motion-'] {
    animation: none;
    background-size: cover;
  }
}
</style>
