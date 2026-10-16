import { createCanvas, CanvasError, joinSession } from '@github/copilot-sdk/extension'
import { boardSchema, CANVAS_ID, reportSchema, validate } from './schema.mjs'
import { ProgressStore } from './storage.mjs'
import { startServer } from './server.mjs'

const instances = new Map()
const opening = new Map()
async function guarded(operation) {
  try {
    return await operation()
  } catch (error) {
    throw new CanvasError('issue_progress_error', error.message)
  }
}
function instance(ctx) {
  const entry = instances.get(ctx.instanceId)
  if (!entry) throw new CanvasError('issue_progress_not_open', '先に Canvas を open してください')
  return entry
}
const canvas = createCanvas({
  id: CANVAS_ID,
  displayName: 'Issue → PR 進捗一覧',
  description: '独立した Issue 実行の明示的な進捗報告と委譲関係をローカルで集約する監視専用画面。',
  inputSchema: boardSchema,
  actions: [
    {
      name: 'report-progress',
      description: 'タスク登録・工程/状態更新・検証・終了を報告。eventId は再送時も同じ値、expectedRevision は取得した現在値を指定。',
      inputSchema: reportSchema,
      handler: (ctx) => guarded(async () => {
        const entry = instance(ctx)
        try {
          const result = await entry.store.report(ctx.input)
          entry.lastReportError = null
          return { duplicate: result.duplicate, taskId: result.task.taskId,
            revision: result.task.revision, status: result.task.status }
        } catch (error) {
          entry.lastReportError = error.message
          throw error
        }
      }),
    },
    {
      name: 'get-progress',
      description: '登録済みタスク・履歴・revision・報告経路の制約を取得する。',
      handler: (ctx) => guarded(() => instance(ctx).store.get()),
    },
  ],
  open: (ctx) => guarded(async () => {
    validate(boardSchema, ctx.input)
    if (opening.has(ctx.instanceId)) await opening.get(ctx.instanceId)
    const existing = instances.get(ctx.instanceId)
    if (existing) {
      if (existing.store.boardId !== ctx.input.boardId) throw new Error('同じ instanceId の boardId は変更できません')
      await existing.store.get()
      return { url: existing.server.url, title: 'Issue → PR 進捗一覧' }
    }
    const initialize = (async () => {
      const store = new ProgressStore(ctx.input.boardId)
      await store.get()
      const entry = { store, lastReportError: null }
      entry.server = await startServer({
        get: async () => ({ ...await store.get(), reportError: entry.lastReportError }),
      })
      instances.set(ctx.instanceId, entry)
      return entry
    })()
    opening.set(ctx.instanceId, initialize)
    try {
      const entry = await initialize
      return { url: entry.server.url, title: 'Issue → PR 進捗一覧' }
    } finally {
      opening.delete(ctx.instanceId)
    }
  }),
  onClose: async (ctx) => {
    if (opening.has(ctx.instanceId)) await opening.get(ctx.instanceId)
    const entry = instances.get(ctx.instanceId)
    if (entry) {
      await entry.server.close()
      instances.delete(ctx.instanceId)
    }
  },
})

await joinSession({ canvases: [canvas] })
