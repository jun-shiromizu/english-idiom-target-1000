# Issue → PR 進捗 Canvas

## 対応範囲

[プロジェクト拡張](../.github/extensions/issue-progress/extension.mjs) の Canvas ID は `english-idiom-issue-progress`。日本語の一覧表で独立した実行を集約する、監視専用の画面です。親を展開すると子タスクと報告履歴を確認できます。起動・停止・再実行・回答代行・マージ・デプロイ機能はありません。

既存の `.github/extensions/` はなく、今回が最初の拡張です。アプリ本体の Vue/Vuetify とは独立した SDK の通常の Web コンテンツとして、依存追加のない semantic HTML/CSS/JavaScript を使っています。アプリのルーター・学習データ・localStorage は変更しません。

| 実行環境 | 報告方法 / 制約 |
|---|---|
| Canvas 対応 SDK ホストの同一セッション | capabilities を確認し、open → アクションで明示報告 |
| 同一マシンの別セッション・別プロセス | 同じ Copilot home と `boardId`、保存権限を共有し、それぞれ公開 Canvas ツールを利用できる場合に集約 |
| サブエージェント | 原則は親が委譲と観測した結果を報告。直接報告はツール利用可能時だけ、同じ taskId で報告担当を一方に限定 |
| Copilot cloud agent / 別マシン | **ローカル Canvas への接続未対応**。公開された正規の経路を確認できない限り詳細工程は取得できない。ローカル保存ファイルや localhost には接続できると仮定しない |
| Canvas ツールがない環境 | 通常のセッション報告と最終報告に経路なし・未送信を明記。画面にも常に cloud 接続の制約を表示 |

GitHub PR・CI の取得や監視、セッション履歴、ホストの非公開 API は使いません。報告がない実行は自動発見できません。PR/CI から報告されていない工程を推定しません。外部サービス、認証情報、ネットワーク公開、定期的な GitHub コメントは追加していません。

公開契約の確認元:

- [SDK Canvas 契約](https://github.com/github/copilot-sdk/blob/main/nodejs/src/canvas.ts)
- [SDK 拡張の joinSession](https://github.com/github/copilot-sdk/blob/main/nodejs/src/extension.ts)
- [公開 RPC 型](https://github.com/github/copilot-sdk/blob/main/nodejs/src/generated/rpc.ts) の CanvasProviderOpenRequest / OpenResult / InvokeActionRequest

Canvas は SDK 上 experimental です。SDK はホストが解決するため、拡張内に package.json を作ったり SDK をインストールしたりしません。

## 開く・状態を取得する

1. 拡張の追加・変更後に `extensions_reload` を実行する（他の拡張も再起動される）。
2. `list_canvas_capabilities` に `canvasId: "english-idiom-issue-progress"` を渡して契約を確認する。
3. `open_canvas` に次を渡す:

```json
{
  "canvasId": "english-idiom-issue-progress",
  "instanceId": "issue-progress-overview",
  "input": { "boardId": "jun-shiromizu.english-idiom-target-1000" }
}
```

4. `invoke_canvas_action` の `instanceId` は同じハンドル、`actionName` は `get-progress`（入力なし）または `report-progress`。

`boardId` は集約する監視ボードの安定した識別子です。別リポジトリを同じボードに登録しても区別されます。同じ instanceId は同じ live server を再利用し、保存状態を再読込します。同じ instanceId の boardId 変更は拒否します。別 instanceId でも同じ boardId なら同じデータを復元します。画面を閉じる・隠すことはタスクの停止・終了を意味しません。

## エージェントの報告契約

アクションは `report-progress` 一つで登録・更新・検証・終了を扱います。[JSON Schema](../.github/extensions/issue-progress/schema.mjs) を capabilities で取得し、保存境界でも同じ制約を検証します。未知の項目、長すぎる要約、不正な日時・識別子・状態は拒否します。

登録例（UUID は例示。実行・タスク・イベントごとに新規発行する）:

```json
{
  "kind": "register",
  "taskId": "1346b8dc-8f01-4f8e-94a1-5c730829b101",
  "eventId": "1346b8dc-8f01-4f8e-94a1-5c730829b102",
  "expectedRevision": 0,
  "observedAt": "2026-10-16T14:00:00.000Z",
  "summary": "Issue の受け入れ条件の調査を開始",
  "registration": {
    "runId": "1346b8dc-8f01-4f8e-94a1-5c730829b103",
    "repository": "jun-shiromizu/english-idiom-target-1000",
    "issue": 123,
    "issueTitle": "対象 Issue の実際のタイトル",
    "taskName": "Issue 123 対応",
    "agent": "issue-to-pr",
    "origin": "local",
    "sessionId": null,
    "parentTaskId": null,
    "parallelGroup": null,
    "reporting": "direct"
  },
  "phases": ["investigation"],
  "status": "running"
}
```

以後は `kind: update`、同じ taskId、新しい eventId、取得した現在の revision を `expectedRevision`、実際の UTC 時刻を observedAt として送ります。登録情報は変更できません。工程・状態を省略すると維持、工程を `[]` にすると進行中工程なし。`reason` は待機・異常終了・中断で必須です。

| 項目 | 値 |
|---|---|
| 工程（複数可） | `investigation` 調査、`documentation` ドキュメント修正、`code` コード修正、`unit` 単体テスト、`e2e` E2E、`pr` PR 作成 |
| 状態 | `pending` 未開始、`running` 実行中、`waiting` ユーザー判断待ち、`completed` 正常終了（PR 作成済み）、`failed` 異常終了、`interrupted` 中断 |
| 子専用の追加状態 | `returned` 子タスク完了・結果引渡し（親の PR 完了とは別） |
| 検証 | `kind: verification` と `verification: { "kind": "unit", "result": "passed", "summary": "対象テスト10件成功" }`。kind は unit/e2e/typecheck/build、result は passed/failed/not-run |
| PR 記録のみ | `pr: { "url": "https://github.com/owner/repo/pull/42", "draft": true, "verifiedAt": "..." }`。PR が存在しても状態は自動変更しない |
| 終了 | `kind: finish` と終了状態。終了後の変更は拒否し、再試行は新しい runId/taskId |

検証結果の報告がない項目は「未取得（結果未報告）」とし、明示的な not-run（未実行）と区別します。開始時刻も、running の報告をまだ受け取っていなければ未取得です。

正常終了は親タスク限定です。`completion` は次の全項目を実際に確認した場合だけ送信します:

```json
{
  "acceptanceMet": true,
  "reviewComplete": true,
  "verificationSatisfied": true,
  "pr": {
    "url": "https://github.com/owner/repo/pull/42",
    "draft": false,
    "verifiedAt": "2026-10-16T14:10:00.000Z"
  }
}
```

同じリポジトリの実際の PR URL、非 Draft、受け入れ条件、差分確認、必要な検証の充足、未終了の子がないことが必要です。最新の検証に失敗が残る場合は拒否します。検証未実行の項目は未実行のまま残し、必要な検証を満たせない場合は verificationSatisfied を true にしてはいけません。**拡張は GitHub を問い合わせません**。実際の PR 確認は報告側が正規の GitHub ツール等で行い、画面は「報告者確認」と表示します。完了宣言の独立した第三者検証ではありません。

### 親子・再送・競合

- 一つの runId は一つの親、一つのリポジトリ・Issue。別実行・再試行は新規 runId。同じ Issue 番号でもリポジトリや実行を混同しない。
- 子は新規 taskId、同じ runId/repository/issue、既存の未終了タスクを parentTaskId に指定。子・孫の状態と履歴を展開できる。
- 未取得の sessionId/parallelGroup は null。委譲だけなら pending。実際の開始を観測した場合だけ running。同じ実行・並列グループの複数タスクが running かつ更新途絶でない場合だけ「同時実行の報告あり」と表示する。独立実行は一覧のそれぞれの状態で把握する。厳密なプロセス生存確認ではない。
- 親が子を登録して結果受領も報告するのが基本。子が直接報告する場合は同じ taskId と現在の revision を共有し、登録・報告の担当を調整する。観測不能な内部工程を埋めない。
- 同じ eventId・同じ内容の再送は保存・履歴を増やさず受理する。別内容での eventId 再利用は拒否する。
- 同じ revision の競合は片方だけを受理し、他方は revision_conflict。最新状態を取得して再評価する。古い時刻の報告も拒否。終了したタスクは再送以外で変更不可。
- `waiting` の報告後に本来の問い合わせ手段で質問し、回答後に running へ戻す。Canvas は問い合わせや回答の代用ではない。
- 報告失敗はアクションのエラーと該当パネルの警告で明示する。本来の作業失敗とは別。パネルの報告失敗警告はそのプロセス内の直近結果であり、別セッションには共有されない。無制限にリトライせず、通常の最終報告にも未送信の制約を残す。

## 更新途絶

画面は読み取り専用 HTTP を3秒間隔で取得し、通常の更新に再 open は不要です。running の最終観測から30分を超えると派生の「更新途絶・要確認」を併記します。最後に報告された状態は running のまま保持し、異常終了とは断定しません。長いテスト・ネットワーク制約・報告不能もあり得ます。waiting と終了済みには経過時間で注意状態を付けません。

これは報告ベースの表示であり、heartbeat やホスト履歴の常時監視ではありません。工程の節目で報告し、短い定期報告を必須にしません。

## 保存と安全性

保存先は SDK 規約どおり、非空の `COPILOT_HOME` をそのまま使い、未設定・空ならユーザーホームの `.copilot` を使った配下の:

```text
extension-data/english-idiom-issue-progress/<SHA-256(boardId)>.json
```

Git 管理ファイルやアプリの localStorage には実行時データを保存しません。format/version/boardId と全イベントを毎回検証し、破損・非対応バージョンは初期化も上書きもしません。自動マイグレーションはありません。要約は最大500文字で、全文ログ・プロンプト・秘密情報の保存は禁止です。秘密情報を自動判別できるものではないため、送信前に報告者が除去してください。データはローカルユーザー権限の保護範囲です。

書き込みは board ごとの排他的 mkdir ロックで、読み取り→検証→更新→同じディレクトリの固有一時ファイル→原子的 rename を直列化します。競合待ちは最大5秒です。ロックを経過時間だけで奪うことはしません。プロセス異常停止で `.json.lock` が残る場合は、関係する書き込みプロセスが停止していることを確認し、データを退避したうえで、その特定の空ロックディレクトリだけを手動削除してください。稼働中に削除しないでください。一時ファイルが残った場合も、停止確認後に該当する固有ファイルだけを整理してください。共有ネットワーク FS のロック保証は対象外です。

保存失敗を握りつぶさず CanvasError として返します。読み込み失敗・保存データ破損は open / 取得アクションでもエラーにし、既に開いている画面では警告し前回表示が最新でないことを示します。HTTP は 127.0.0.1 の動的ポートで GET のみ、Host/Origin を検証します。認証情報や private state を URL に置かず、書き込みは公開 Canvas アクションに限定します。文字列の DOM 挿入には textContent を使います。

## 検証

既存の Vitest と jsdom を再利用します。Node のファイル・HTTP・別プロセスを扱うため、アプリ用の jsdom 設定と分離した [拡張用設定](../.github/extensions/issue-progress/vitest.config.mjs) を使用します。

```powershell
node --check .github\extensions\issue-progress\extension.mjs
npx vitest run --config .github\extensions\issue-progress\vitest.config.mjs
```

[テスト](../.github/extensions/issue-progress/progress.test.mjs) は複数実行、親子・並列、待機と再開、検証結果、PR 完了条件、更新途絶、再送・古い報告・プロセス競合、復元、不正入力、破損・保存失敗、HTTP、空状態・制約表示を扱います。PR のモデルテストは外部に副作用を起こさない入力フィクスチャであり、実際の PR を作成・確認したことを意味しません。

実機確認は reload → capabilities → open → アクション → 同じ instanceId の再 open とブラウザーで行います。検証用データは専用の boardId に分離し、実作業として誤認させる正常終了を登録しないでください。

2026-10-16 の確認では全モジュールの構文検証、上記 Vitest 22件、SDK の reload / capabilities / open / 両アクション / 同じ instanceId の再 open を実施しました。ブラウザーでは空状態、独立2実行・子2件、並列表示、絞り込み、キーボード展開とフォーカス、待機から再開、再 open 不要の更新、拡張再起動後の復元を確認しました。検証用の親は PR 未作成のため正常終了とせず中断、子は結果引渡しとして終了し、専用ボードに分離しています。

別プロセスの保存競合はテスト済みですが、別の実 Copilot セッションや cloud agent からのエンドツーエンド報告は確認していません。実際の PR 作成・GitHub 照合、ホストでの表示を隠す操作による onClose 通知の差異、プロセス強制終了・電源断も実機確認の対象外です。
