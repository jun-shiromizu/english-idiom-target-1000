# GitHub Copilot カスタムインストラクション

## このリポジトリについて

- 高校生向けの英熟語暗記アプリ（英熟語ターゲット1000）。
- 技術スタックは Vue 3 + TypeScript + Vite + Vuetify + GitHub Pages。
- 認証は使わず、学習履歴と中断セッションは localStorage で管理する。
- 仕様は `docs/spec.md`、実装計画は `docs/plan.md` を参照する。

## 実装ルール

- UI は Vuetify を使い、Tailwind CSS は使わない。
- ルーターは Vue Router + `createWebHashHistory` を使う。
- 状態管理は composables + localStorage で行い、Pinia は使わない。
- GitHub Pages の `base` は `/english-idiom-target-1000/`。
- データ取得設定は `src/config.ts` に集約する。
- ファイル一覧は GitHub Contents API、ファイル内容は GitHub Raw URL を使い、キャッシュしない。
- localStorage キーは `idiom-app-history` と `idiom-app-session` を使う。

## 変更時の確認ポイント

- `specs/` を変更したら、対応する `tests/e2e/` の `.spec.ts` も更新する。
- E2E テストは `specs/<画面>/<アクション>.yaml` と `tests/e2e/<画面>/<アクション>.spec.ts` のミラー構成を守る。
- `status: done` のシナリオには対応するテストコードが存在する状態を保つ。
- E2E テストでは DOM セレクタ（`#id`, `.class`, `nth-child` など）と `waitForTimeout()` を使わない。
- composable や view の状態変更ロジックを修正した場合は、対応するユニットテストを追加・更新する。
- バグ修正ではリグレッションテストを追加してから完了とする。
- localStorage に機密情報を保存しない。
- GitHub API トークンなどの秘密情報をクライアントコードへ埋め込まない。

## Git / PR 運用

- `main` への直接 push は前提にしない。必要に応じてブランチを切り、PR で変更する。
- 既存の feature branch がある場合はそのブランチを尊重する。
- Issue 対応では、可能ならブランチ名・コミットメッセージ・PR 本文に Issue 番号を反映する。
- コミットメッセージ、PR タイトル、PR 本文、レビューコメントは日本語で書く。
- `git push` とデプロイは、必ずユーザー確認後に行う。
