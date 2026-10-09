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

## 本リポジトリのActions

Actions タブに表示されるワークフローの一覧です。YAML ファイルで定義しているものと、GitHub の設定によって GitHub 側が自動で動かすもの（リポジトリ内に YAML はありません）があります。

### 一覧

| 名前 | 定義場所 | トリガー | 概要 |
|---|---|---|---|
| Required PR Checks | [.github/workflows/ci.yml](.github/workflows/ci.yml) | `main` 向けの PR、手動実行 | PR の型チェック・テスト・ビルド |
| Deploy to GitHub Pages | [.github/workflows/deploy.yml](.github/workflows/deploy.yml) | 手動実行のみ | GitHub Pages へのデプロイ |
| Copilot Cloud Agent Setup | [.github/workflows/copilot-setup-steps.yml](.github/workflows/copilot-setup-steps.yml) | 手動実行、このファイルへの push | Copilot cloud agent の作業環境の準備 |
| Dependabot Updates | GitHub の設定（内容は [.github/dependabot.yml](.github/dependabot.yml)） | 週 1 回のスケジュール、セキュリティアラート | 依存関係の更新 PR の作成 |
| CodeQL | GitHub の設定（Code security → CodeQL default setup） | push、PR、定期実行 | コードの脆弱性検査 |
| Copilot cloud agent | GitHub の設定（Copilot cloud agent） | Issue を Copilot に割り当てる、PR で Copilot に依頼する | Copilot による実装と PR の作成 |
| Copilot code review | GitHub の設定（`main` の ruleset） | PR の作成・更新 | Copilot による PR レビュー |
| Copilot | GitHub の設定（Copilot 関連） | Copilot 機能の利用時 | Copilot 関連の実行履歴 |
| pages-build-deployment | GitHub の設定（Pages の Source が「Deploy from a branch」の場合） | ブランチへの push | GitHub 標準の Pages 公開処理（現在は未使用） |

### Required PR Checks

`required-checks` ジョブで以下を順に実行します。

1. Node 24 のセットアップと `npm ci`
2. E2E テスト用の Chrome のセットアップ
3. 型チェック（`vue-tsc --noEmit`）
4. ユニットテスト（`vitest run`）
5. Vite 開発サーバーを `http://127.0.0.1:4173/english-idiom-target-1000/` で起動し、応答するまで最大 60 秒待機
6. E2E テスト（`npm run test:e2e`）
7. プロダクションビルド（`npm run build`）

続いて `publish-required-status` ジョブが、`required-checks` の成否にかかわらず実行され、結果を `required-pr-checks` というコミットステータスとして PR に付けます。`main` の ruleset ではこのステータスをマージの必須条件にしています。

### Deploy to GitHub Pages

[デプロイ](#デプロイ) の手順で手動実行します。

1. `build` ジョブ：`npm ci`、型チェック、ユニットテスト、ビルドを行い、`dist/` を Pages artifact としてアップロード
2. `deploy` ジョブ：`actions/deploy-pages` で GitHub Pages に公開

同時実行は `github-pages` グループで 1 つに制限され、新しい実行が始まると古い実行はキャンセルされます。E2E テストは含みません。

### Copilot Cloud Agent Setup

Copilot cloud agent が作業を始める前に実行する準備手順です。Node 24 と依存関係（`npm ci`）、E2E テスト用の Chrome を用意します。このファイルを変更して push したときにも実行されるため、準備手順が正しく動くかを確認できます。

### Dependabot Updates

[.github/dependabot.yml](.github/dependabot.yml) の設定に従い、週 1 回更新を確認して PR を作成します。PR には `dependencies` ラベルが付きます。

- npm：PR は最大 5 件。`vitest` と `@vitest/*` はまとめて 1 つの PR
- GitHub Actions：PR は最大 2 件。`github-actions` ラベルも付く

Dependabot security updates も有効なため、脆弱性アラートに対応する PR も作成されます。作成された PR は Required PR Checks で確認されます。

### CodeQL

Code scanning の default setup により GitHub 側が実行します。検出結果は Security タブの Code scanning alerts に表示され、Copilot Autofix による修正案も利用できます。

### Copilot cloud agent

Issue を Copilot に割り当てると、Copilot が実装し、PR を作成・更新します。準備段階で Copilot Cloud Agent Setup の手順が使われます。作業時の方針は [.github/copilot-instructions.md](.github/copilot-instructions.md) や [.github/agents](.github/agents) などのカスタマイズに従います。

### Copilot code review

`main` の ruleset で自動リクエストを設定しているため、PR に Copilot のレビューが付きます。レビューは [.github/instructions/review-common.instructions.md](.github/instructions/review-common.instructions.md) の指示に従い、日本語で行われます。

### Copilot

Copilot 関連機能の実行履歴です。何をきっかけに実行されたかは、各実行の詳細で確認できます。

### pages-build-deployment

Pages の Source が「Deploy from a branch」のときに GitHub が自動で動かす公開処理です。現在は Source を `GitHub Actions` にして Deploy to GitHub Pages で公開しているため使っていません。Actions タブに表示されているのは過去の実行履歴です。

