export const CANVAS_ID = 'english-idiom-issue-progress'
export const phases = ['investigation', 'documentation', 'code', 'unit', 'e2e', 'pr']
export const statuses = ['pending', 'running', 'waiting', 'completed', 'returned', 'failed', 'interrupted']
const text = (maxLength = 500) => ({ type: 'string', minLength: 1, maxLength })
const uuid = { ...text(36), pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' }
const nullable = (schema) => ({ anyOf: [schema, { type: 'null' }] })
const object = (properties, required = Object.keys(properties)) => ({
  type: 'object', properties, required, additionalProperties: false,
})
const timestamp = { ...text(24), pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$' }
const phaseList = { type: 'array', items: { enum: phases }, maxItems: 6, uniqueItems: true }
export const boardSchema = object({ boardId: { ...text(100), pattern: '^[a-zA-Z0-9._-]+$' } })
export const registrationSchema = object({
  runId: uuid,
  repository: { ...text(150), pattern: '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' },
  issue: { type: 'integer', minimum: 1 },
  issueTitle: text(200),
  taskName: text(150),
  agent: text(100),
  origin: { enum: ['local', 'cloud', 'subagent', 'unknown'] },
  sessionId: nullable(text(150)),
  parentTaskId: nullable(uuid),
  parallelGroup: nullable(text(100)),
  reporting: { enum: ['direct', 'parent', 'unavailable'] },
})
export const verificationSchema = object({
  kind: { enum: ['unit', 'e2e', 'typecheck', 'build'] },
  result: { enum: ['passed', 'failed', 'not-run'] },
  summary: text(),
})
export const completionSchema = object({
  acceptanceMet: { const: true },
  reviewComplete: { const: true },
  verificationSatisfied: { const: true },
  pr: object({
    url: { ...text(300), pattern: '^https://github\\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/pull/[1-9][0-9]*$' },
    draft: { const: false },
    verifiedAt: timestamp,
  }),
})
export const prSchema = object({
  url: completionSchema.properties.pr.properties.url,
  draft: { type: 'boolean' },
  verifiedAt: timestamp,
})
export const reportSchema = object({
  taskId: uuid,
  eventId: uuid,
  expectedRevision: { type: 'integer', minimum: 0 },
  observedAt: timestamp,
  summary: text(),
  kind: { enum: ['register', 'update', 'verification', 'finish'] },
  registration: registrationSchema,
  phases: phaseList,
  status: { enum: statuses },
  reason: nullable(text()),
  verification: verificationSchema,
  completion: completionSchema,
  pr: prSchema,
}, ['taskId', 'eventId', 'expectedRevision', 'observedAt', 'summary', 'kind'])

// The runtime receives the same schema; validate again at the persistence boundary.
export function validate(schema, value, at = 'input') {
  if (schema.anyOf) {
    if (!schema.anyOf.some((part) => { try { validate(part, value, at); return true } catch { return false } })) {
      throw new Error(`${at}: 許可されていない値です`)
    }
    return
  }
  if ('const' in schema && value !== schema.const) throw new Error(`${at}: 値が一致しません`)
  if (schema.enum && !schema.enum.includes(value)) throw new Error(`${at}: 不明な値です`)
  if (schema.type === 'null' && value !== null) throw new Error(`${at}: null が必要です`)
  if (schema.type === 'boolean' && typeof value !== 'boolean') throw new Error(`${at}: 真偽値が必要です`)
  if (schema.type === 'string' && (typeof value !== 'string' || value.length < (schema.minLength ?? 0) ||
    value.length > (schema.maxLength ?? Infinity) || (schema.pattern && !new RegExp(schema.pattern).test(value)))) {
    throw new Error(`${at}: 文字列の形式・長さが不正です`)
  }
  if (schema === timestamp && (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value)) {
    throw new Error(`${at}: 日時が不正です`)
  }
  if (schema.type === 'integer' && (!Number.isSafeInteger(value) || value < schema.minimum)) {
    throw new Error(`${at}: 整数の範囲が不正です`)
  }
  if (schema.type === 'array') {
    if (!Array.isArray(value) || value.length > schema.maxItems || new Set(value).size !== value.length) {
      throw new Error(`${at}: 配列が不正です`)
    }
    value.forEach((item, i) => validate(schema.items, item, `${at}[${i}]`))
  }
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${at}: オブジェクトが必要です`)
    for (const key of schema.required) if (!Object.hasOwn(value, key)) throw new Error(`${at}.${key}: 必須です`)
    for (const [key, item] of Object.entries(value)) {
      if (!Object.hasOwn(schema.properties, key)) throw new Error(`${at}.${key}: 不明な項目です`)
      validate(schema.properties[key], item, `${at}.${key}`)
    }
  }
}
