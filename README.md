# 英単語／英熟語暗記アプリ

[![CI](https://github.com/jun-shiromizu/english-idiom-target-1000/actions/workflows/ci.yml/badge.svg)](https://github.com/jun-shiromizu/english-idiom-target-1000/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/jun-shiromizu/english-idiom-target-1000/actions/workflows/deploy.yml/badge.svg)](https://github.com/jun-shiromizu/english-idiom-target-1000/actions/workflows/deploy.yml)
![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vue.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Vuetify](https://img.shields.io/badge/Vuetify-3-1867c0?logo=vuetify&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-2-6e9f18?logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-1-2ead33?logo=playwright&logoColor=white)

高校生向け英単語／英熟語暗記アプリ（旺文社・英単語ターゲット1900／英熟語ターゲット1000）。

> アプリの詳細仕様は [docs/spec.md](docs/spec.md)、実装計画は [docs/plan.md](docs/plan.md) を参照してください。

---

## 本番 URL

**https://jun-shiromizu.github.io/english-idiom-target-1000/**

---

## 開発環境のセットアップ

```bash
npm install
npm run dev
```

`http://localhost:5173/english-idiom-target-1000/` で起動します。

---

## 修正の仕方

### ソースコードの構成

```
src/
├── config.ts              # GitHub リポジトリ設定・localStorage キー
├── types/index.ts         # 型定義
├── main.ts                # エントリーポイント（Vuetify・Router 設定）
├── views/
│   ├── HomeView.vue       # トップページ（出題設定フォーム）
│   ├── SettingsView.vue   # テーマ設定画面
│   ├── QuizView.vue       # 出題画面
│   ├── GameView.vue       # falling word game 画面
│   └── ResultView.vue     # 結果サマリー画面
├── components/
│   ├── QuizQuestion.vue   # 問題カード
│   ├── QuizAnswer.vue     # 回答カード
│   ├── ProgressBar.vue    # 進捗バー
│   └── SupplementContent.vue  # 補足データ表示
└── composables/
    ├── useGameChoices.ts  # game 用の選択肢生成
    ├── useGitHubData.ts   # データ取得（GitHub API / Raw URL）
    ├── useHistory.ts      # 正解/不正解履歴（localStorage）
    ├── useQuizSession.ts  # セッション管理
    └── useThemeSettings.ts # テーマ設定の永続化
```

### データリポジトリの設定変更

問題データのリポジトリ・ブランチを変更する場合は `src/config.ts` を編集します。

```ts
export const GITHUB_OWNER = 'jun-shiromizu'

export const BOOKS = {
    'idiom-target-1000': {
        title: '英熟語ターゲット1000',
        dataRepo: 'english-idiom-target-1000-data',
        dataBranch: 'main',
        dataPath: 'idiom-target-1000',
    },
    'word-target-1900': {
        title: '英単語ターゲット1900',
        dataRepo: 'english-idiom-target-1000-data',
        dataBranch: 'main',
        dataPath: 'word-target-1900',
    },
} as const
```

---

## テストの仕方

### ユニットテスト（Vitest）

```bash
# ウォッチモード（開発中）
npm run test:unit

# 1回実行
npx vitest run

# カバレッジ計測
npm run test:coverage
```

テストファイルは `src/composables/__tests__/`、`src/components/__tests__/`、`src/views/__tests__/` 配下にあります。

### E2Eテスト（Playwright）

ローカルの開発サーバーに対して実行：

```bash
npm run test:e2e
```

ブラウザを表示して実行（デバッグ用）：

```bash
npm run test:e2e:headed
```

本番 URL に対して実行：

```bash
$env:BASE_URL="https://jun-shiromizu.github.io/english-idiom-target-1000/"
npm run test:e2e
```

#### 初回のみ：Playwright ブラウザのインストール

```bash
npx playwright install
```

---

## CI とリリースの仕方

Pull Request を開くと GitHub Actions の CI が自動で以下を実行します。

1. 型チェック（`vue-tsc --noEmit`）
2. ユニットテスト（`vitest run`）
3. E2E テスト（`npm run test:e2e`）
4. プロダクションビルド（`vite build`）

Dependabot の PR も同じ CI で確認できます。ワークフローの状況は [Actions タブ](https://github.com/jun-shiromizu/english-idiom-target-1000/actions) と PR 画面の checks で確認できます。

Branch protection で required check を設定する場合は、`required-pr-checks` を選択します。

### main ブランチのルール

このリポジトリの `main` には ruleset が設定されています。次のルールが有効です。

1. `main` への直接マージは不可で、Pull Request 経由でのみ取り込みます。
2. マージ前に status check の成功が必要です。必須チェックは `required-pr-checks` です。
3. force push は禁止されています。
4. ブランチ削除は制限されています。
5. Copilot code review を自動でリクエストします。

補足:

- 対象ブランチは `main` です。
- bypass list は空で、例外ユーザー・チーム・App は設定されていません。

### セキュリティ設定

現時点では GitHub の Security and quality で次の設定になっています。

1. Security advisories は有効です。
2. Dependabot alerts は有効です。
3. Dependabot security updates は有効です。
4. Dependabot malware alerts は有効です。
5. Dependency graph は有効です。
6. Private vulnerability reporting は無効です。
7. Security policy は未設定です。
8. Code scanning（CodeQL analysis）は有効です。
9. Secret Protection は追加で有効化できる状態です。

補足:

- `.github/dependabot.yml` で npm と GitHub Actions に対する Dependabot version updates を週次で設定しています。
- Grouped security updates は無効です。
- Automatic dependency submission は無効です。
- Copilot Autofix は ON です。CodeQL analysis を有効化済みのため、code scanning alert に対する修正提案を利用できます。
- 公開リポジトリでは partner patterns に該当するシークレットが検出された場合、GitHub からパートナーへ通知されます。
- partner patterns による通知は、通常の repository alerts と同じ表示とは限りません。

### デプロイ

デプロイは `main` への push では自動実行されません。まとめて反映したいタイミングで、Actions タブ → "Deploy to GitHub Pages" → "Run workflow" から手動実行します。
GitHub Pages の Settings > Pages では、Source を `GitHub Actions` に設定します。

手動デプロイ時には以下を実行し、ビルド成果物を GitHub Pages へ artifact デプロイします。

1. 型チェック（`vue-tsc --noEmit`）
2. ユニットテスト（`vitest run`）
3. プロダクションビルド（`vite build`）
4. Pages artifact を upload
5. `actions/deploy-pages` で公開
