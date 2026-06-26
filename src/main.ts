import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import { createRouter, createWebHashHistory } from 'vue-router'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

import App from './App.vue'
import HomeView from './views/HomeView.vue'
import QuizView from './views/QuizView.vue'
import ResultView from './views/ResultView.vue'
import GameView from './views/GameView.vue'
import SettingsView from './views/SettingsView.vue'
import DictationView from './views/DictationView.vue'
import ClozeView from './views/ClozeView.vue'
import TypingRaceView from './views/TypingRaceView.vue'
import BattleDeckView from './views/BattleDeckView.vue'
import BattleDungeonView from './views/BattleDungeonView.vue'
import BattleView from './views/BattleView.vue'
import BattleResultView from './views/BattleResultView.vue'
import { DEFAULT_THEME_ID, VUETIFY_THEMES, loadStoredThemeId } from './theme'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: loadStoredThemeId() ?? DEFAULT_THEME_ID,
    themes: VUETIFY_THEMES,
  },
})

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/settings', name: 'settings', component: SettingsView },
    { path: '/quiz', name: 'quiz', component: QuizView },
    { path: '/dictation', name: 'dictation', component: DictationView },
    { path: '/cloze', name: 'cloze', component: ClozeView },
    { path: '/typing-race', name: 'typing-race', component: TypingRaceView },
    { path: '/game', name: 'game', component: GameView },
    { path: '/result', name: 'result', component: ResultView },
    { path: '/battle/deck', name: 'battle-deck', component: BattleDeckView },
    { path: '/battle/dungeons', name: 'battle-dungeons', component: BattleDungeonView },
    { path: '/battle/play', name: 'battle-play', component: BattleView },
    { path: '/battle/result', name: 'battle-result', component: BattleResultView },
  ],
})

createApp(App).use(vuetify).use(router).mount('#app')
