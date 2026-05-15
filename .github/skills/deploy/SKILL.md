---
name: deploy
description: 'GitHub Pages へのデプロイを行う。Use when デプロイする、GitHub Pagesに公開する、本番環境に反映する、GitHub Actionsワークフローを作る、と依頼されたとき。'
---

# GitHub Pages デプロイ

Vue 3 アプリを GitHub Pages に公開する手順。

## デプロイ方式

- `gh-pages` ブランチ方式を採用
- GitHub Actions でビルド → `gh-pages` ブランチへ自動 push
- **手動 push は行わない**。全てワークフロー経由でデプロイ

## デプロイ前の必須条件

- **デプロイ前に必ずローカルで全テストを通すこと**
- 一部の関連テストだけで済ませず、少なくとも以下をすべて成功させてから `main` へ push すること
  - `npx vitest run`
  - `npm run test:e2e`
  - `npm run build`
- いずれか 1 つでも失敗した場合は、**デプロイ作業を中断して先に修正すること**
- GitHub Actions で検知させる前にローカルで失敗を止めることを優先する

## 公開 URL

```
https://jun-shiromizu.github.io/english-idiom-target-1000/
```

## 前提: vite.config.ts の設定

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  base: '/english-idiom-target-1000/',   // ← GitHub Pages のサブパスに必須
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
})
```

## 前提: Vue Router の設定

GitHub Pages は SPA のサーバーサイドルーティングに対応していないため `createWebHashHistory` を使用：

```typescript
import { createWebHashHistory, createRouter } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})
```

## GitHub Actions ワークフロー

ファイル: `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to gh-pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## GitHub Pages の有効化手順

初回のみリポジトリで設定が必要：

1. GitHub リポジトリの Settings > Pages を開く
2. Source を「Deploy from a branch」に設定
3. Branch を「gh-pages」/「root」に設定
4. Save

## デプロイの流れ

```
ローカルで npx vitest run / npm run test:e2e / npm run build を全て成功
  ↓
main ブランチへ push
  ↓
GitHub Actions トリガー
  ↓
npm ci → npm run build
  ↓
dist/ 成果物を gh-pages ブランチへ push
  ↓
GitHub Pages が自動で配信
```

## ローカルビルド確認

デプロイ前にローカルでビルド成果物を確認する：

```bash
# ビルド
npm run build

# ビルド成果物をローカルプレビュー（base パス込みで確認）
npm run preview
# → http://localhost:4173/english-idiom-target-1000/
```

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| ページが真っ白 | `base` 設定が抜けている | `vite.config.ts` の `base` を確認 |
| ルーティングが 404 | `createBrowserHistory` を使っている | `createWebHashHistory` に変更 |
| 画像が表示されない | `public/` ではなく `src/assets/` に配置している | 画像は `public/` に置くか import する |
| Actions が失敗する | `permissions: contents: write` が抜けている | ワークフロー YAML を確認 |
| gh-pages ブランチがない | 初回デプロイ前 | ワークフローを手動実行（workflow_dispatch） |

## 本番動作確認

デプロイ後に以下を確認する（e2e-runner スキル参照）：

```bash
# 本番 URL を対象に E2E テスト実行
$env:BASE_URL="https://jun-shiromizu.github.io/english-idiom-target-1000/"; npm run test:e2e
```
