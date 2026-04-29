# GitHub Copilot カスタムインストラクション

## プロジェクト概要

高校生向けの英熟語暗記アプリ（旺文社・英熟語ターゲット1000）。
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

### 6. セキュリティ

- localStorage に機密情報を保存していないこと
- GitHub API トークンをクライアントコードに埋め込んでいないこと（public リポジトリ前提なのでトークン不要だが、誤って混入しないよう注意）
