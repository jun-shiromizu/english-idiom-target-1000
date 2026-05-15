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

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
  },
})

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/quiz', name: 'quiz', component: QuizView },
    { path: '/game', name: 'game', component: GameView },
    { path: '/result', name: 'result', component: ResultView },
  ],
})

createApp(App).use(vuetify).use(router).mount('#app')
