import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import http from 'node:http'
import { JSDOM } from 'jsdom'
import { appendReport, emptyState, snapshot, STALE_MS } from './model.mjs'
import { ProgressStore } from './storage.mjs'
import { startServer } from './server.mjs'

const cleanups = []
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()()
})
const now = () => new Date().toISOString()
function register(overrides = {}, extra = {}) {
  return {
    taskId: randomUUID(), eventId: randomUUID(), expectedRevision: 0, observedAt: now(),
    summary: '検証用の報告', kind: 'register',
    registration: {
      runId: randomUUID(), repository: 'owner/repo', issue: 1, issueTitle: '検証用 Issue',
      taskName: '検証用タスク', agent: 'issue-to-pr', origin: 'local', sessionId: null,
      parentTaskId: null, parallelGroup: null, reporting: 'direct', ...overrides,
    },
    ...extra,
  }
}
function update(task, extra = {}) {
  return { taskId: task.taskId, eventId: randomUUID(), expectedRevision: task.revision,
    observedAt: now(), summary: '更新', kind: 'update', ...extra }
}
function completion() {
  return { acceptanceMet: true, reviewComplete: true, verificationSatisfied: true,
    pr: { url: 'https://github.com/owner/repo/pull/42', draft: false, verifiedAt: now() } }
}
async function store(options = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'issue-progress-'))
  cleanups.push(() => rm(directory, { recursive: true, force: true }))
  return new ProgressStore('test-board', { directory, ...options })
}
function apply(state, event) { return appendReport(state, event).task }

describe('進捗モデル', () => {
  it('複数リポジトリ、同じ Issue の再実行を別タスクとして集約する', () => {
    const state = emptyState('board')
    apply(state, register())
    apply(state, register())
    apply(state, register({ repository: 'other/repo' }))
    expect(snapshot(state).tasks).toHaveLength(3)
  })
  it('工程と状態を分離し、判断待ちから再開する', () => {
    const state = emptyState('board')
    let task = apply(state, register({}, { phases: ['code', 'documentation'], status: 'running' }))
    task = apply(state, update(task, { status: 'waiting', reason: '仕様判断が必要' }))
    expect(task.phases).toEqual(['code', 'documentation'])
    expect(task.status).toBe('waiting')
    expect(() => apply(state, update(task, { status: 'waiting', reason: null }))).toThrow('理由')
    task = apply(state, update(task, { status: 'running' }))
    expect(task.reason).toBeNull()
  })
  it('登録時刻を実際の開始時刻と混同しない', () => {
    const state = emptyState('board')
    let task = apply(state, register())
    expect(task.startedAt).toBeNull()
    task = apply(state, update(task, { status: 'running' }))
    const started = task.startedAt
    task = apply(state, update(task, { status: 'waiting', reason: '判断待ち' }))
    expect(task.startedAt).toBe(started)
    expect(started).not.toBeNull()
  })
  it('待機理由を失敗理由として再利用せず、正常終了時には消す', () => {
    const state = emptyState('board')
    let task = apply(state, register({}, { status: 'waiting', reason: '仕様の回答待ち' }))
    expect(() => apply(state, update(task, { kind: 'finish', status: 'failed' }))).toThrow('理由')
    task = apply(state, update(task, { kind: 'finish', status: 'completed', completion: completion() }))
    expect(task.reason).toBeNull()
  })
  it('親子・並列グループと子の結果引渡しは親の状態を変更しない', () => {
    const state = emptyState('board')
    const parent = apply(state, register({}, { status: 'running' }))
    const child1 = apply(state, register({
      runId: parent.runId, parentTaskId: parent.taskId, parallelGroup: 'tests', reporting: 'parent',
    }, { status: 'running' }))
    apply(state, register({ runId: parent.runId, parentTaskId: parent.taskId, parallelGroup: 'tests' }, { status: 'running' }))
    apply(state, update(child1, { kind: 'finish', status: 'returned', summary: '子の結果を受領' }))
    const tasks = snapshot(state).tasks
    expect(tasks[0].status).toBe('running')
    expect(tasks[1].status).toBe('returned')
    expect(tasks[2].parallelGroup).toBe('tests')
    expect(() => apply(state, register({ runId: parent.runId }))).toThrow('runId')
    expect(() => apply(state, register({ parentTaskId: parent.taskId }))).toThrow('親タスク')
  })
  it('検証の成功・失敗・未実行を区別する', () => {
    const state = emptyState('board')
    let task = apply(state, register())
    for (const [kind, result] of [['unit', 'passed'], ['e2e', 'failed'], ['build', 'not-run']]) {
      task = apply(state, update(task, { kind: 'verification', verification: { kind, result, summary: '結果の要約' } }))
    }
    expect(Object.values(task.verifications).map((v) => v.result)).toEqual(['passed', 'failed', 'not-run'])
    expect(() => apply(state, update(task, { kind: 'finish', status: 'completed', completion: completion() }))).toThrow('失敗した検証')
  })
  it('PR だけ、Draft、別リポジトリ、完了条件なしでは正常終了しない', () => {
    const state = emptyState('board')
    let task = apply(state, register())
    task = apply(state, update(task, { pr: { ...completion().pr, draft: true } }))
    expect(task.status).toBe('pending')
    expect(() => apply(state, update(task, { kind: 'finish', status: 'completed' }))).toThrow('完了条件')
    const draft = completion()
    draft.pr.draft = true
    expect(() => apply(state, update(task, { kind: 'finish', status: 'completed', completion: draft }))).toThrow()
    const other = completion()
    other.pr.url = 'https://github.com/other/repo/pull/42'
    expect(() => apply(state, update(task, { kind: 'finish', status: 'completed', completion: other }))).toThrow('リポジトリ')
    task = apply(state, update(task, { kind: 'finish', status: 'completed', completion: completion() }))
    expect(task.status).toBe('completed')
    expect(task.pr.draft).toBe(false)
    expect(() => apply(state, update(task, { status: 'running' }))).toThrow('終了済み')
  })
  it('未終了の子があると親を正常終了しない', () => {
    const state = emptyState('board')
    const parent = apply(state, register())
    apply(state, register({ runId: parent.runId, parentTaskId: parent.taskId }))
    expect(() => apply(state, update(parent, { kind: 'finish', status: 'completed', completion: completion() }))).toThrow('未終了の子')
  })
  it('異常終了と更新途絶を区別し、待機中には更新途絶を付けない', () => {
    const state = emptyState('board')
    const at = new Date(Date.now() - STALE_MS - 1000).toISOString()
    apply(state, register({}, { status: 'running', observedAt: at }))
    apply(state, register({}, { status: 'waiting', reason: '回答待ち', observedAt: at }))
    let failed = apply(state, register())
    failed = apply(state, update(failed, { kind: 'finish', status: 'failed', reason: 'ビルド不能' }))
    const tasks = snapshot(state).tasks
    expect(tasks.map((t) => t.stale)).toEqual([true, false, false])
    expect(tasks[0].status).toBe('running')
    expect(failed.status).toBe('failed')
  })
  it('重複の再送は増やさず、内容違い・古い revision・古い日時を拒否する', () => {
    const state = emptyState('board')
    const event = register({}, { observedAt: '2026-01-01T00:00:00.000Z' })
    const task = apply(state, event)
    expect(appendReport(state, structuredClone(event)).duplicate).toBe(true)
    expect(state.events).toHaveLength(1)
    expect(() => apply(state, { ...event, summary: '別内容' })).toThrow('eventId')
    expect(() => apply(state, update(task, { expectedRevision: 0 }))).toThrow('revision_conflict')
    expect(() => apply(state, update(task, { observedAt: '2025-01-01T00:00:00.000Z' }))).toThrow('古い')
  })
  it('不正入力、未知の項目、未来・不正な日時を拒否する', () => {
    for (const event of [
      { ...register(), secret: '保存しない' },
      { ...register(), taskId: '../bad' },
      { ...register(), phases: ['invented'] },
      { ...register(), observedAt: '2026-02-30T00:00:00.000Z' },
      { ...register(), observedAt: '2999-01-01T00:00:00.000Z' },
      { ...register(), toString: '未知項目' },
    ]) expect(() => apply(emptyState('board'), event)).toThrow()
  })
})

describe('永続化・競合・HTTP', () => {
  it('再生成した store で復元し、並列更新を消失させない', async () => {
    const original = await store()
    await Promise.all(Array.from({ length: 10 }, () => new ProgressStore('test-board', { directory: original.directory }).report(register())))
    expect((await new ProgressStore('test-board', { directory: original.directory }).get()).tasks).toHaveLength(10)
  })
  it('独立プロセスの更新を直列化する', async () => {
    const original = await store()
    const source = `import { ProgressStore } from ${JSON.stringify(new URL('./storage.mjs', import.meta.url).href)};
      await new ProgressStore('test-board', {directory: process.argv[1]}).report(JSON.parse(process.argv[2]));`
    await Promise.all(Array.from({ length: 4 }, () => new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['--input-type=module', '-e', source, original.directory, JSON.stringify(register())], { stdio: ['ignore', 'ignore', 'pipe'] })
      let errors = ''
      child.stderr.on('data', (chunk) => { errors += chunk })
      child.on('error', reject)
      child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(errors)))
    })))
    expect((await original.get()).tasks).toHaveLength(4)
  })
  it('同じ revision の競合は片方を拒否し、再送で履歴を増やさない', async () => {
    const original = await store()
    const event = register()
    const { task } = await original.report(event)
    await original.report(event)
    const result = await Promise.allSettled([original.report(update(task)), original.report(update(task))])
    expect(result.filter((r) => r.status === 'rejected')).toHaveLength(1)
    expect((await original.get()).tasks[0].history).toHaveLength(2)
  })
  it('破損・未知バージョンを上書きせず、ロックを回収する', async () => {
    const original = await store()
    for (const raw of ['{broken', JSON.stringify({ ...emptyState('test-board'), version: 99 })]) {
      await writeFile(original.file, raw)
      await expect(original.get()).rejects.toThrow('破損')
      await expect(original.report(register())).rejects.toThrow('上書きしません')
      expect(await readFile(original.file, 'utf8')).toBe(raw)
    }
  })
  it('保存失敗・読み込み失敗・ロックタイムアウトを明示する', async () => {
    const original = await store()
    const fs = await import('node:fs/promises')
    const broken = new ProgressStore('test-board', { directory: original.directory,
      fs: { ...fs, rename: async () => { throw new Error('disk full') } } })
    await expect(broken.report(register())).rejects.toThrow('保存失敗: disk full')
    expect((await original.get()).tasks).toHaveLength(0)
    const unreadable = new ProgressStore('test-board', { directory: original.directory,
      fs: { ...fs, readFile: async () => { throw Object.assign(new Error('denied'), { code: 'EACCES' }) } } })
    await expect(unreadable.get()).rejects.toThrow('読み込み失敗')
    await mkdir(original.lock)
    await expect(new ProgressStore('test-board', { directory: original.directory, lockTimeout: 30 }).report(register())).rejects.toThrow('タイムアウト')
  })
  it('HTTP は同一 origin の取得のみ許可し、読み込み失敗を返す', async () => {
    const original = await store()
    const server = await startServer(original)
    cleanups.push(server.close)
    expect((await (await fetch(`${server.url}api/state`)).json()).tasks).toEqual([])
    expect((await fetch(server.url, { method: 'POST' })).status).toBe(405)
    expect((await fetch(server.url, { headers: { Origin: 'https://example.com' } })).status).toBe(403)
    const rebound = await new Promise((resolve, reject) => {
      http.get(server.url, { headers: { Host: 'attacker.test' } }, (response) => {
        response.resume()
        resolve(response.statusCode)
      }).on('error', reject)
    })
    expect(rebound).toBe(403)
    expect((await fetch(`${server.url}not-found`)).status).toBe(404)
    await writeFile(original.file, '{broken')
    const response = await fetch(`${server.url}api/state`)
    expect(response.status).toBe(500)
    expect((await response.json()).error).toContain('破損')
  })
})

describe('日本語 Canvas UI', () => {
  async function page(state) {
    const dom = new JSDOM(await readFile(new URL('./index.html', import.meta.url), 'utf8'),
      { url: 'http://127.0.0.1:1234', runScripts: 'outside-only' })
    cleanups.push(() => dom.window.close())
    dom.window.fetch = async () => ({ ok: true, json: async () => state })
    dom.window.AbortSignal.timeout = () => undefined
    dom.window.setInterval = () => 0
    dom.window.eval(await readFile(new URL('./client.mjs', import.meta.url), 'utf8'))
    await new Promise((resolve) => setImmediate(resolve))
    return dom.window
  }
  it('一覧・多段の親子・並列・複数工程・履歴・制約を表示する', async () => {
    const state = emptyState('test')
    const parent = apply(state, register({}, { status: 'running', phases: ['code', 'documentation'] }))
    const child = apply(state, register({ taskName: '子', runId: parent.runId, parentTaskId: parent.taskId, parallelGroup: 'g', reporting: 'parent' }, { status: 'running' }))
    apply(state, register({ taskName: '孫', runId: parent.runId, parentTaskId: child.taskId, parallelGroup: 'g' }, { status: 'running' }))
    apply(state, register({ taskName: '<script>危険</script>', reporting: 'unavailable' }))
    const window = await page(snapshot(state))
    const content = window.document.body.textContent
    for (const text of ['全タスク 4 件', '同時実行の報告あり', '複数工程を報告中', '孫', '報告経路なし', 'cloud agent', '未取得（結果未報告）']) expect(content).toContain(text)
    expect(window.document.querySelectorAll('details')).toHaveLength(4)
    expect(window.document.querySelector('strong script')).toBeNull()
    const filter = window.document.getElementById('filter')
    filter.value = 'waiting'
    filter.dispatchEvent(new window.Event('change'))
    expect(window.document.body.textContent).toContain('条件に一致するタスクはありません')
  })
  it('空状態・報告失敗を明示する', async () => {
    const window = await page({ ...snapshot(emptyState('empty')), reportError: '保存失敗' })
    expect(window.document.body.textContent).toContain('まだ報告はありません')
    expect(window.document.getElementById('error').hidden).toBe(false)
    expect(window.document.getElementById('error').textContent).toContain('本来の作業失敗とは別')
  })
  it('検証の成功・失敗・未実行・未取得をそれぞれ表示する', async () => {
    const state = emptyState('test')
    let task = apply(state, register())
    for (const [kind, result] of [['unit', 'passed'], ['e2e', 'failed'], ['build', 'not-run']]) {
      task = apply(state, update(task, { kind: 'verification', verification: { kind, result, summary: '表示の検証' } }))
    }
    const window = await page(snapshot(state))
    for (const text of ['単体テスト: 成功', 'E2E テスト: 失敗', 'ビルド: 未実行', '型チェック: 未取得（結果未報告）']) {
      expect(window.document.body.textContent).toContain(text)
    }
  })
  it('読み込み失敗を表示し、同じデータでの再取得でも復旧する', async () => {
    const state = snapshot(emptyState('test'))
    const window = await page(state)
    window.fetch = async () => { throw new Error('接続不能') }
    window.document.getElementById('refresh').click()
    await new Promise((resolve) => setImmediate(resolve))
    expect(window.document.getElementById('error').textContent).toContain('読み込み失敗')
    window.fetch = async () => ({ ok: true, json: async () => state })
    window.document.getElementById('refresh').click()
    await new Promise((resolve) => setImmediate(resolve))
    expect(window.document.getElementById('error').hidden).toBe(true)
    expect(window.document.getElementById('status').textContent).toContain('全タスク 0 件')
  })
  it('自動更新で展開状態とキーボードフォーカスを保つ', async () => {
    const state = emptyState('test')
    let task = apply(state, register({}, { status: 'running' }))
    const window = await page(snapshot(state))
    const details = window.document.querySelector('details')
    details.open = true
    details.dispatchEvent(new window.Event('toggle'))
    details.querySelector('summary').focus()
    task = apply(state, update(task, { status: 'waiting', reason: '判断待ち' }))
    window.fetch = async () => ({ ok: true, json: async () => snapshot(state) })
    window.document.getElementById('refresh').click()
    await new Promise((resolve) => setImmediate(resolve))
    expect(window.document.querySelector('details').open).toBe(true)
    expect(window.document.activeElement.tagName).toBe('SUMMARY')
    expect(window.document.body.textContent).toContain('ユーザー判断待ち')
  })
})
