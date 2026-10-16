const phaseNames = { investigation: '調査', documentation: 'ドキュメント修正', code: 'コード修正', unit: '単体テスト', e2e: 'E2E テスト', pr: 'PR 作成' }
const stateNames = { pending: '未開始', running: '実行中', waiting: 'ユーザー判断待ち', completed: '正常終了（PR 作成済み）', returned: '子タスク完了（結果引渡し）', failed: '異常終了', interrupted: '中断' }
const originNames = { local: 'ローカル', cloud: 'cloud（明示報告のみ）', subagent: 'サブエージェント', unknown: '未取得' }
const reportingNames = { direct: '直接報告', parent: '親による観測報告', unavailable: '報告経路なし・内部工程は未取得' }
const verificationNames = { unit: '単体テスト', e2e: 'E2E テスト', typecheck: '型チェック', build: 'ビルド' }
const results = { passed: '成功', failed: '失敗', 'not-run': '未実行' }
const table = document.getElementById('tasks')
const filter = document.getElementById('filter')
const status = document.getElementById('status')
const error = document.getElementById('error')
let data
let busy = false
let previous = ''
const expanded = new Set()
const stamp = (value) => new Date(value).toLocaleString('ja-JP')
function element(tag, text, className) {
  const node = document.createElement(tag)
  if (text !== undefined) node.textContent = text
  if (className) node.className = className
  return node
}
function link(text, url) {
  const node = element('a', text)
  node.href = url
  node.target = '_blank'
  node.rel = 'noopener noreferrer'
  return node
}
function matches(task) {
  return filter.value === 'all' || (filter.value === 'attention'
    ? task.stale || ['failed', 'interrupted'].includes(task.status) || task.reporting === 'unavailable'
    : task.status === filter.value)
}
function row(task, all, depth) {
  const tr = element('tr', undefined, task.status)
  const cells = Array.from({ length: 9 }, () => {
    const cell = element('td')
    tr.append(cell)
    return cell
  })
  cells[0].append(link(`${task.repository} #${task.issue}`, `https://github.com/${task.repository}/issues/${task.issue}`),
    element('div', task.issueTitle), element('strong', `${'↳ '.repeat(depth)}${task.taskName}`),
    element('small', `実行: ${task.runId}`), element('small', `タスク: ${task.taskId}`))
  cells[1].append(element('div', task.agent), element('div', originNames[task.origin]),
    element('small', `セッション: ${task.sessionId ?? '未取得'}`), element('small', reportingNames[task.reporting]))
  if (!task.phases.length) cells[2].textContent = '未報告'
  for (const phase of task.phases) cells[2].append(element('span', phaseNames[phase], 'badge'))
  if (task.phases.length > 1) cells[2].append(element('small', '複数工程を報告中'))
  cells[3].append(element('div', stateNames[task.status]))
  if (task.stale) cells[3].append(element('div', '更新途絶・要確認（最後の報告状態は上記）', 'warning'))
  cells[4].append(element('div', `開始: ${task.startedAt ? stamp(task.startedAt) : '未取得'}`),
    element('div', `最終報告: ${stamp(task.observedAt)}`))
  const peers = task.parallelGroup ? all.filter((t) => t.taskId !== task.taskId && t.runId === task.runId &&
    t.parallelGroup === task.parallelGroup && t.status === 'running' && !t.stale) : []
  cells[5].append(element('div', task.parentTaskId ? `親: ${task.parentTaskId}` : '親タスク'),
    element('small', `並列グループ: ${task.parallelGroup ?? '未取得'}`),
    element('div', task.status === 'running' && !task.stale && peers.length
      ? `同時実行の報告あり（他 ${peers.length} 件）` : '同時実行は未確認'))
  cells[6].append(element('div', task.summary))
  if (task.reason) cells[6].append(element('div', task.reason, 'warning'))
  if (task.staleReason) cells[6].append(element('div', task.staleReason, 'warning'))
  for (const [kind, name] of Object.entries(verificationNames)) {
    const result = task.verifications[kind]
    cells[7].append(element('div', `${name}: ${result ? results[result.result] : '未取得（結果未報告）'}`))
    if (result) cells[7].append(element('small', result.summary))
  }
  if (task.pr) cells[8].append(link(task.pr.draft ? 'Draft PR' : 'PR を開く', task.pr.url),
    element('small', `報告者確認: ${stamp(task.pr.verifiedAt)}`))
  else cells[8].textContent = '未報告'
  return tr
}
function appendTask(task, all, depth = 0, target = table) {
  target.append(row(task, all, depth))
  const detailRow = element('tr')
  const cell = element('td')
  cell.colSpan = 9
  const details = element('details')
  details.dataset.task = task.taskId
  details.open = expanded.has(task.taskId)
  const children = all.filter((t) => t.parentTaskId === task.taskId)
  details.append(element('summary', `${task.taskName} — 子タスク ${children.length} 件 / 報告履歴 ${task.history.length} 件`))
  const history = element('ol', undefined, 'history')
  for (const event of task.history) {
    const phaseText = event.phases ? (event.phases.map((p) => phaseNames[p]).join('・') || '進行中工程なし') : '工程維持'
    const verification = event.verification
      ? ` / ${verificationNames[event.verification.kind]}: ${results[event.verification.result]} — ${event.verification.summary}` : ''
    history.append(element('li', `${stamp(event.observedAt)} / ${event.kind} / ${event.status ? stateNames[event.status] : '状態維持'} / ${phaseText} — ${event.summary}${event.reason ? ` / 理由: ${event.reason}` : ''}${verification}`))
  }
  details.append(history)
  if (children.length) {
    const childTable = element('table')
    childTable.append(element('caption', '委譲した子タスク（親の完了状態には連動しません）'))
    childTable.append(document.querySelector('thead').cloneNode(true))
    const body = element('tbody')
    // Nested tasks use the same layout, including their own delegation history.
    childTable.append(body)
    details.append(childTable)
    for (const child of children) appendTask(child, all, depth + 1, body)
  }
  cell.append(details)
  detailRow.append(cell)
  target.append(detailRow)
}
function render() {
  if (!data) return
  const active = document.activeElement
  const focusId = active?.tagName === 'SUMMARY' ? active.parentElement.dataset.task : null
  table.replaceChildren()
  const roots = data.tasks.filter((t) => !t.parentTaskId)
  const visible = roots.filter((t) => matches(t) || data.tasks.some((child) => child.runId === t.runId && matches(child)))
  for (const task of visible) appendTask(task, data.tasks)
  if (!visible.length) {
    const tr = element('tr')
    const cell = element('td', data.tasks.length ? '条件に一致するタスクはありません。' : 'まだ報告はありません。エージェントがタスクを登録すると表示されます。')
    cell.colSpan = 9
    tr.append(cell)
    table.append(tr)
  }
  status.textContent = `${data.boardId} / 実行 ${roots.length} 件・全タスク ${data.tasks.length} 件 / 3秒間隔で取得`
  document.getElementById('limitation').textContent = data.limitation
  if (focusId) [...table.querySelectorAll('details')].find((d) => d.dataset.task === focusId)?.querySelector('summary')?.focus()
}
table.addEventListener('toggle', (event) => {
  const node = event.target
  if (node.tagName === 'DETAILS') {
    if (node.open) expanded.add(node.dataset.task)
    else expanded.delete(node.dataset.task)
  }
}, true)
async function refresh() {
  if (busy) return
  busy = true
  try {
    const response = await fetch('/api/state', { cache: 'no-store', signal: AbortSignal.timeout(5000) })
    const next = await response.json()
    if (!response.ok) throw new Error(next.error ?? `HTTP ${response.status}`)
    data = next
    error.hidden = !data.reportError
    error.textContent = data.reportError ? `報告・保存失敗（本来の作業失敗とは別）: ${data.reportError}` : ''
    const serialized = JSON.stringify(next)
    if (serialized !== previous || status.textContent.startsWith('読み込み失敗')) {
      render()
      previous = serialized
    }
  } catch (failure) {
    error.hidden = false
    error.textContent = `読み込み失敗: ${failure.message}。前回表示は最新とは限りません。`
    status.textContent = '読み込み失敗。再取得できます。'
  } finally {
    busy = false
  }
}
filter.addEventListener('change', render)
document.getElementById('refresh').addEventListener('click', () => { previous = ''; refresh() })
refresh()
setInterval(refresh, 3000)
