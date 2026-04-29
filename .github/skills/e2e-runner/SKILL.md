---
name: e2e-runner
description: 'E2Eテストを実行する。Use when テストを実行する、テストを走らせる、playwright test、npm test、特定のテストだけ実行、デバッグ実行、と依頼されたとき。'
---

# E2Eテスト実行

Playwright テストを実行し、結果を確認する。

## When to Use This Skill

- 「テストを実行して」「テストを走らせて」と依頼されたとき
- 特定のテストファイルだけ実行したいとき
- デバッグモードやヘッド付きで実行したいとき
- CI でのテスト実行を設定するとき

## 前提条件

実行前に以下が完了していること:

```bash
# 依存パッケージがインストール済み
npm install

# Playwright ブラウザがインストール済み
npx playwright install --with-deps chromium
```

## 実行コマンド

### 基本実行

```bash
# 全テスト実行
npm test

# 特定ファイルのみ
npx playwright test tests/login.spec.ts

# 特定テスト名でフィルタ
npx playwright test -g "ログイン"
```

### デバッグ・開発用

```bash
# ブラウザを表示して実行（動作確認用）
npm run test:headed

# Playwright UI モード（インタラクティブ）
npm run test:ui

# デバッグモード（ステップ実行）
npm run test:debug
```

### テスト対象の切り替え

```bash
# ローカル開発サーバ
$env:BASE_URL="http://localhost:3000"; npm test

# ステージング環境
$env:BASE_URL="https://staging.example.com"; npm test

# SauceDemo（デフォルト - 環境変数なしで実行可能）
npm test
```

PowerShell 以外の場合:
```bash
# bash / zsh
BASE_URL=http://localhost:3000 npm test
```

## 実行結果の確認

### テスト成功時

```
Running 3 tests using 1 worker

  ✓ login.spec.ts:8:5 › ログイン › 標準ユーザーでログインできる (2.1s)
  ✓ add-to-cart.spec.ts:8:5 › カート追加 › 商品をカートに追加できる (3.4s)
  ✓ checkout.spec.ts:8:5 › チェックアウト › 注文を完了できる (5.2s)

  3 passed (12.3s)
```

### テスト失敗時

1. コンソール出力でエラー内容を確認
2. `test-results/` 配下にスクリーンショット・トレースが保存される
3. `npm run report` で HTML レポートを開いて詳細確認

### Trace Viewer で失敗を分析

```bash
# 失敗テストのトレースを開く
npx playwright show-trace test-results/<test-name>/trace.zip
```

## CI 実行（GitHub Actions）

`.github/workflows/e2e-test.yml` で自動実行される:

- **トリガー**: main への push / PR 作成 / 手動実行
- **手動実行時**: Actions タブから `workflow_dispatch` で BASE_URL を指定可能
- **成果物**: playwright-report, evidence, test-results が Artifact として保存

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| ブラウザが見つからない | `npx playwright install --with-deps chromium` |
| タイムアウトする | ネットワーク確認。CI なら `retries: 2` で対応済み |
| ローカルでは通るがCIで落ちる | ヘッドレス固有の問題。`video: 'on'` で動作確認 |
| 要素が見つからない | セマンティックロケータの name が変わっていないか確認 |
