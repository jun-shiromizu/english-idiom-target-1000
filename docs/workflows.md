# GitHub Actions Workflows

このドキュメントは [.github/workflows/ci.yml](../.github/workflows/ci.yml) と [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) をもとに、現行の GitHub Actions ワークフローの要件・仕様・運用前提をリバースして整理したものです。

## 対象 workflow

1. `Required PR Checks`
2. `Deploy to GitHub Pages`

---

## 共通要件

両 workflow から読み取れる共通要件は次のとおりです。

1. 実行環境は `ubuntu-latest` を使用する。
2. Node.js は `20` を使用する。
3. 依存関係は `npm ci` でインストールする。
4. npm キャッシュを有効化する。
5. 型チェック、ユニットテスト、E2E テスト、ビルドの順で検証する。
6. E2E テストのために Playwright の Chromium ブラウザを事前インストールする。

補足:

- E2E テストは [playwright.config.ts](../playwright.config.ts) の設定に従い、`BASE_URL` が未指定のときは `npm run dev` でローカルサーバーを起動して実行する。
- workflow 定義上、依存インストール後に必ず全検証を通したうえでビルドまたはデプロイに進む。

---

## Required PR Checks

### 目的

`main` 向け Pull Request に対して、必須の品質ゲートを実行し、branch protection から参照できる単一の status check `required-pr-checks` を発行する。

### トリガー

1. `pull_request` on `main`
2. `workflow_dispatch`

### 権限

1. `contents: read`
2. `statuses: write`

### ジョブ構成

#### 1. `required-checks`

このジョブは実際の検証を担当する。

実行順:

1. リポジトリを checkout
2. Node.js 20 をセットアップ
3. `npm ci`
4. `npx playwright install --with-deps chromium`
5. `npx vue-tsc --noEmit`
6. `npx vitest run`
7. `npm run test:e2e`
8. `npm run build`

このジョブが成功した場合のみ、コード変更は required checks を通過したとみなされる。

#### 2. `publish-required-status`

このジョブは branch protection 向けの commit status を発行する。

仕様:

1. `required-checks` に依存する。
2. `if: always()` により、上流ジョブが失敗しても必ず実行する。
3. `required-checks` の結果が `success` なら commit status を `success` にする。
4. それ以外は `failure` を発行する。
5. status context 名は `required-pr-checks` で固定する。
6. Pull Request イベントでは head SHA に対して status を付与し、それ以外では `context.sha` を使用する。

### 運用上の意味

1. branch protection / ruleset では、必須 status check に `required-pr-checks` を設定する前提になっている。
2. 個々のジョブ名や step 名ではなく、集約済み status context を required check として扱う設計になっている。
3. PR 上で一部の検証が失敗した場合でも、required check が未報告のまま残らない。

### 暗黙の要件

1. リポジトリは `npm ci` が成功する lockfile を維持していること。
2. E2E テストが CI 上でも起動できるよう、`npm run dev` と Playwright 設定が壊れていないこと。
3. `npm run build` が production build として成立していること。

---

## Deploy to GitHub Pages

### 目的

検証済みの成果物を `gh-pages` ブランチへ反映し、GitHub Pages に公開する。

### トリガー

1. `workflow_dispatch` のみ

このため、`main` への push や Pull Request マージでは自動デプロイされない。

### 権限

1. `contents: write`

### ジョブ構成

#### 1. `deploy`

このジョブは検証から公開までを一括で担当する。

実行順:

1. リポジトリを checkout
2. Node.js 20 をセットアップ
3. `npm ci`
4. `npx vue-tsc --noEmit`
5. `npx vitest run`
6. `npx playwright install --with-deps chromium`
7. `npm run test:e2e`
8. `npm run build`
9. `peaceiris/actions-gh-pages@v4` で `./dist` を公開

### デプロイ仕様

1. 公開先ブランチは `gh-pages`。
2. 公開対象ディレクトリは `./dist`。
3. 認証には `secrets.GITHUB_TOKEN` を使用する。
4. workflow 内で build artifact を別ジョブへ受け渡しせず、同一ジョブ内で build して即デプロイする。

### 運用前提

1. GitHub Pages の公開元は `Deploy from a branch` を選び、`gh-pages` / `/(root)` を向ける必要がある。
2. `gh-pages` ブランチへの書き込みが `GITHUB_TOKEN` で許可されている必要がある。
3. デプロイ前に型チェック、ユニットテスト、E2E テスト、ビルドのすべてが成功する必要がある。

### 暗黙の要件

1. `vite.config.ts` の `base` は GitHub Pages の公開パスと整合していること。
2. ルーター設定は GitHub Pages 上で動くよう、hash history 前提になっていること。
3. deploy workflow は手動実行前提のため、公開タイミングは運用で管理すること。

---

## 現行設計の特徴

1. CI とデプロイの検証内容はほぼ同一で、デプロイ前に再度フルチェックを走らせる設計になっている。
2. デプロイ専用 workflow は CI 成功を外部的に参照せず、手動実行時点の HEAD に対して独立に再検証する。
3. GitHub Pages への公開は公式 Pages artifact 方式ではなく、`gh-pages` ブランチへ push する方式を採用している。
4. required check は workflow/job 名ではなく `required-pr-checks` という commit status 名に抽象化されている。

## 現時点で workflow からは定義されていないこと

1. `push` 時の自動 CI 実行
2. `main` マージ後の自動デプロイ
3. concurrency 制御
4. cache の高度な最適化
5. CodeQL などの code scanning workflow
6. workflow 実行結果を artifact として保存する仕組み
