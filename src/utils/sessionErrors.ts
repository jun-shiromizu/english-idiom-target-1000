/** セッション保存の失敗（容量不足など） */
export class SessionSaveError extends Error {
  constructor(options?: ErrorOptions) {
    super('学習データを端末に保存できませんでした。ブラウザの保存容量を確認してください。', options)
    this.name = 'SessionSaveError'
  }
}
