// jsdom に存在しない Web API のポリフィル（Vuetify コンポーネントのテスト用）
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
