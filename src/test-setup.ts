// jsdom に存在しない Web API のポリフィル（Vuetify コンポーネントのテスト用）
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
