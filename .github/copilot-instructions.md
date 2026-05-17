# GitHub Copilot カスタムインストラクション

## プロジェクト概要

高校生向けの英熟語暗記アプリ（旺文社・英単語ターゲット1900、英熟語ターゲット1000）。
Vue 3 + Vuetify + GitHub Pages 構成。認証なし・localStorage でデータ管理。

詳細は `docs/spec.md`、実装計画は `docs/plan.md` を参照すること。

---

## 実装ガイドライン

実装作業を行う際は `vue-dev` スキルを参照すること。主要な規約を以下に示す。

### 技術スタック

- **フレームワーク**: Vue 3 + TypeScript + Vite
- **UI**: Vuetify（主軸）。Tailwind CSS は使用しない
- **ルーター**: Vue Router（`createWebHashHistory` 使用）
- **状態管理**: composables + localStorage（Pinia は使用しない）
- **ホスティング**: GitHub Pages（`base: '/english-idiom-target-1000/'`）

### データアクセス

- ファイル一覧: GitHub Contents API
- ファイル内容: GitHub Raw URL（毎回取得、キャッシュなし）
- 設定値は `src/config.ts` に集約する

### localStorage キー

| キー | 用途 |
|---|---|
| `idiom-app-history` | 正解/不正解履歴 |
| `idiom-app-session` | 中断セッション |

---

## 開発フロー

自律的に開発を進める際の標準フロー:

```
全体判断（delivery-flow スキル）
  ↓
実装（vue-dev スキル）
  ↓
ユニットテスト作成（unit-test-codegen スキル）
  ↓
ユニットテスト実行（unit-test-runner スキル）
  ↓
E2Eテスト仕様作成（e2e-spec-writer スキル）
  ↓
E2Eテストコード生成（e2e-codegen スキル）
  ↓
E2Eテスト実行（e2e-runner スキル）
  ↓
デプロイ（deploy スキル）※ push 前にユーザー確認
  ↓
本番テスト（e2e-runner スキル、BASE_URL=本番URL）
```

## Git / PR 運用ルール

以下は常に守ること。

### 1. `main` への直接 push を前提にしない

- branch protection により `main` への直接 push は禁止される前提で進める
- ユーザーが「`main` で修正して push して」と依頼しても、そのまま実行せず、ブランチ作成と PR フローに切り替える
- まず現在のブランチ、作業ツリー、`origin/main` との差分を確認する

### 2. まず状況を分類する

- 依頼が「修正からコミット・PRまで」なら `delivery-flow` スキルを入口にして、必要に応じて `commit-and-pr` スキルを使う
- 依頼が「本番反映」なら `deploy` スキルを使う
- 依頼が曖昧でも、現在ブランチ、未コミット差分、Issue 番号の有無を先に確認する

### 3. 既存ブランチを尊重する

- ユーザーがすでに feature branch で作業している場合は、そのブランチを使う
- ユーザーがすでに修正済みで「コミットと PR だけ」と依頼した場合は、不要なブランチ作り直しをしない
- `main` 上で変更がある場合は、そのまま push せず、必要に応じて退避ブランチを切ってから進める

### 4. Issue 番号を運用に反映する

- 「Issue #999 に対応して」のような依頼では、可能ならブランチ名、コミットメッセージ、PR 本文に Issue 番号を反映する
- PR 本文では関連 Issue を分かる形で明記する

### 5. コミット / PR は日本語を基本にする

- コミットメッセージは日本語で簡潔に書く
- PR タイトルと本文も日本語で書く
- レビューコメント、レビュー返信、レビュー要約も日本語で書く
- 確認内容には実行したテストや build を明記する

### push・デプロイの確認

`git push` および GitHub Actions のトリガーはユーザーの確認を得てから実行する。

---

## コードレビューチェックリスト

Pull Request をレビューする際、以下の観点を確認すること。

### 1. specs と tests の同期

- `specs/` 配下の YAML が追加・変更されている場合、対応する `tests/e2e/` の `.spec.ts` も変更されていること
- ミラー構成: `specs/<画面>/<アクション>.yaml` → `tests/e2e/<画面>/<アクション>.spec.ts`

### 2. シナリオ ID の整合性

- `test()` のタイトルに含まれるシナリオID（例: `HOME-001`）が YAML のシナリオID と一致していること

### 3. status フィールドの整合性

- YAML の `status: done` のシナリオに対応するテストコードが存在すること

### 4. セマンティックロケータの使用

- DOM セレクタ（`#id`, `.class`, `nth-child` 等）を使っていないこと
- `waitForTimeout()` を使っていないこと

### 5. ユニットテストのカバレッジ

- composables の変更には対応するユニットテストが含まれていること
- views の状態変更ロジック（セッション操作・ルーティング）の変更には対応するユニットテストが含まれていること
- **バグ修正時は必ずリグレッションテストを追加してから push すること**（`unit-test-codegen` スキル参照）

### 6. セキュリティ

- localStorage に機密情報を保存していないこと
- GitHub API トークンをクライアントコードに埋め込んでいないこと（public リポジトリ前提なのでトークン不要だが、誤って混入しないよう注意）
