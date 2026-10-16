import * as fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createHash, randomUUID } from 'node:crypto'
import { CANVAS_ID, boardSchema, validate } from './schema.mjs'
import { appendReport, emptyState, materialize, snapshot } from './model.mjs'

export class ProgressStore {
  constructor(boardId, options = {}) {
    validate(boardSchema, { boardId })
    this.boardId = boardId
    const home = process.env.COPILOT_HOME || path.join(os.homedir(), '.copilot')
    this.directory = options.directory ?? path.join(home, 'extension-data', CANVAS_ID)
    this.file = path.join(this.directory, `${createHash('sha256').update(boardId).digest('hex')}.json`)
    this.lock = `${this.file}.lock`
    this.fs = options.fs ?? fs
    this.lockTimeout = options.lockTimeout ?? 5000
  }

  async readState() {
    let raw
    try {
      raw = await this.fs.readFile(this.file, 'utf8')
    } catch (error) {
      if (error.code === 'ENOENT') return emptyState(this.boardId)
      throw new Error(`読み込み失敗 (${error.code ?? error.message})`, { cause: error })
    }
    let state
    try {
      state = JSON.parse(raw)
      materialize(state, this.boardId)
    } catch (error) {
      throw new Error(`保存データ破損・非対応形式: ${error.message}。初期化・上書きしません`, { cause: error })
    }
    return state
  }

  async get() {
    return snapshot(await this.readState())
  }

  async report(input) {
    await this.fs.mkdir(this.directory, { recursive: true })
    const deadline = Date.now() + this.lockTimeout
    while (true) {
      try {
        await this.fs.mkdir(this.lock)
        break
      } catch (error) {
        if (error.code !== 'EEXIST') throw new Error(`保存ロック取得失敗: ${error.code ?? error.message}`, { cause: error })
        if (Date.now() >= deadline) throw new Error('保存ロック待ちタイムアウト。競合または停止プロセスのロックを確認してください')
        await new Promise((resolve) => setTimeout(resolve, 25))
      }
    }
    const temp = `${this.file}.${randomUUID()}.tmp`
    try {
      const state = await this.readState()
      const result = appendReport(state, input)
      if (!result.duplicate) {
        await this.fs.writeFile(temp, JSON.stringify(state), { flag: 'wx', mode: 0o600 })
        await this.fs.rename(temp, this.file)
      }
      return result
    } catch (error) {
      throw new Error(`保存失敗: ${error.message}`, { cause: error })
    } finally {
      await this.fs.rm(temp, { force: true })
      await this.fs.rmdir(this.lock)
    }
  }
}
