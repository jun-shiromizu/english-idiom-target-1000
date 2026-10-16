import { isDeepStrictEqual } from 'node:util'
import { reportSchema, validate } from './schema.mjs'

export const FORMAT = 'english-idiom-issue-progress'
export const VERSION = 1
export const STALE_MS = 30 * 60 * 1000
const terminal = new Set(['completed', 'returned', 'failed', 'interrupted'])
export const emptyState = (boardId) => ({ format: FORMAT, version: VERSION, boardId, events: [] })

export function reduceReport(tasks, report, now = Date.now()) {
  validate(reportSchema, report)
  if (Date.parse(report.observedAt) > now + 60_000) throw new Error('未来の報告日時です')
  const current = tasks.get(report.taskId)
  if (report.expectedRevision !== (current?.revision ?? 0)) throw new Error('revision_conflict: 最新状態を取得して再確認してください')
  if (current && terminal.has(current.status)) throw new Error('終了済みタスクです。再試行は新しい runId/taskId で登録してください')
  if (current && Date.parse(report.observedAt) < Date.parse(current.observedAt)) throw new Error('古い報告日時です')
  if (report.kind !== 'register' && !current) throw new Error('タスクが未登録です')
  if (report.kind !== 'register' && report.registration) throw new Error('登録情報は変更できません')
  if ((report.kind === 'verification') !== Boolean(report.verification)) throw new Error('verification 報告の形式が不正です')
  if (report.kind !== 'finish' && report.completion) throw new Error('completion は finish 専用です')
  let task
  if (report.kind === 'register') {
    if (current || !report.registration || report.expectedRevision !== 0) throw new Error('登録情報が不正です')
    const registration = report.registration
    const parent = registration.parentTaskId && tasks.get(registration.parentTaskId)
    if (registration.parentTaskId && (!parent || parent.runId !== registration.runId ||
      parent.repository !== registration.repository || parent.issue !== registration.issue || terminal.has(parent.status))) {
      throw new Error('親タスクは同じ実行・Issue の未終了タスクである必要があります')
    }
    if (!registration.parentTaskId && [...tasks.values()].some((t) => t.runId === registration.runId)) {
      throw new Error('runId は独立した実行ごとに新規発行してください')
    }
    task = { ...registration, taskId: report.taskId, registeredAt: report.observedAt, startedAt: null,
      phases: [], status: 'pending', reason: null, verifications: {}, history: [] }
  } else {
    task = structuredClone(current)
  }
  const previousStatus = task.status
  if (report.phases) task.phases = report.phases
  if (report.status) task.status = report.status
  if (!task.startedAt && task.status === 'running') task.startedAt = report.observedAt
  if ('reason' in report) task.reason = report.reason
  if (['waiting', 'failed', 'interrupted'].includes(task.status) &&
    (!task.reason || (task.status !== previousStatus && !report.reason))) throw new Error('待機・失敗・中断にはその状態の理由が必要です')
  if (['running', 'pending', 'completed', 'returned'].includes(task.status)) task.reason = null
  if (report.verification) task.verifications[report.verification.kind] = report.verification
  if (terminal.has(task.status) && report.kind !== 'finish') throw new Error('終了状態は finish で報告してください')
  if (report.kind === 'finish' && !terminal.has(task.status)) throw new Error('finish には終了状態が必要です')
  if (task.status === 'completed') {
    if (task.parentTaskId) throw new Error('子タスクの完了は returned で報告してください')
    if (!report.completion) throw new Error('実際の非 Draft PR と完了条件の確認が必要です')
    const { pr } = report.completion
    if (!pr.url.startsWith(`https://github.com/${task.repository}/pull/`) ||
      Date.parse(pr.verifiedAt) > Date.parse(report.observedAt)) throw new Error('PR のリポジトリ・確認日時が不正です')
    if (Object.values(task.verifications).some((v) => v.result === 'failed')) throw new Error('失敗した検証が残っています')
    if ([...tasks.values()].some((t) => t.runId === task.runId && t.taskId !== task.taskId && !terminal.has(t.status))) {
      throw new Error('未終了の子タスクが残っています')
    }
    task.completion = report.completion
  } else if (report.completion) {
    throw new Error('PR 完了情報は completed 専用です')
  }
  if (task.status === 'returned' && !task.parentTaskId) throw new Error('returned は子タスク専用です')
  const pr = report.completion?.pr ?? report.pr
  if (pr) {
    if (!pr.url.startsWith(`https://github.com/${task.repository}/pull/`) ||
      Date.parse(pr.verifiedAt) > Date.parse(report.observedAt)) throw new Error('PR のリポジトリ・確認日時が不正です')
    if (report.pr && report.completion && !isDeepStrictEqual(report.pr, report.completion.pr)) throw new Error('PR 情報が一致しません')
    task.pr = pr
  }
  task.revision = report.expectedRevision + 1
  task.observedAt = report.observedAt
  task.summary = report.summary
  task.history.push(report)
  tasks.set(task.taskId, task)
  return task
}

export function materialize(state, boardId) {
  if (!state || state.format !== FORMAT || state.version !== VERSION || state.boardId !== boardId ||
    Object.keys(state).sort().join() !== 'boardId,events,format,version' || !Array.isArray(state.events)) {
    throw new Error('保存データの形式・バージョン・識別子が不正です。上書きしません')
  }
  const tasks = new Map()
  const ids = new Set()
  for (const event of state.events) {
    if (ids.has(event.eventId)) throw new Error('保存データに重複 eventId があります')
    reduceReport(tasks, event)
    ids.add(event.eventId)
  }
  return tasks
}

export function appendReport(state, report) {
  validate(reportSchema, report)
  const tasks = materialize(state, state.boardId)
  const previous = state.events.find((event) => event.eventId === report.eventId)
  if (previous) {
    if (!isDeepStrictEqual(previous, report)) throw new Error('eventId が異なる内容で再利用されています')
    return { duplicate: true, task: tasks.get(report.taskId) }
  }
  const task = reduceReport(tasks, report)
  state.events.push(report)
  return { duplicate: false, task }
}

export function snapshot(state, now = Date.now()) {
  return {
    boardId: state.boardId, staleMinutes: STALE_MS / 60_000,
    limitation: 'ローカルで受領した明示的な報告のみ。cloud agent の接続・詳細工程は未対応。PR・CI から工程を推測しません。',
    tasks: [...materialize(state, state.boardId).values()].map((task) => ({
      ...task,
      stale: task.status === 'running' && now - Date.parse(task.observedAt) > STALE_MS,
      staleReason: task.status === 'running' && now - Date.parse(task.observedAt) > STALE_MS
        ? '最終報告から30分以上。長時間処理・報告経路の制約の可能性があり、異常終了とは断定しません。' : null,
    })),
  }
}
