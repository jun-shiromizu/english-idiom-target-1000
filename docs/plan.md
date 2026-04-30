# 実装計画

## 画面構成

| # | 画面 | パス | 説明 |
|---|---|---|---|
| 1 | トップページ | `/` | 出題設定、セッション再開、不正解履歴クリア |
| 2 | 出題画面 | `/quiz` | 問題表示 → 回答表示 → 正解/不正解判定 |
| 3 | 結果サマリー画面 | `/result` | セッション終了後の結果表示、次のアクション選択 |

## コンポーネント設計

```
src/
├── App.vue
├── main.ts
├── router/
│   └── index.ts
├── views/
│   ├── HomeView.vue          … トップページ
│   ├── QuizView.vue          … 出題画面
│   └── ResultView.vue        … 結果サマリー画面
├── components/
│   ├── QuizQuestion.vue      … 問題表示（タップで回答表示に切替）
│   ├── QuizAnswer.vue        … 回答表示（正解/不正解ボタン、スワイプ対応）
│   ├── ProgressBar.vue       … 進捗インジケーター
│   └── SupplementContent.vue … 回答表示時に補足データを取得しMarkdown→HTML変換表示
├── composables/
│   ├── useGitHubData.ts      … GitHub API/Raw URLからのデータ取得
│   ├── useQuizSession.ts     … セッション管理（出題順生成、進捗管理）
│   └── useHistory.ts         … 正解/不正解履歴のlocalStorage管理
├── types/
│   └── index.ts              … 型定義（Idiom, Mean, QuizSession など）
└── config.ts                 … GitHub リポジトリURL等の設定値
```

## 型定義

```typescript
// 熟語データ（JSONファイルの構造）
interface IdiomData {
  idioms: string[]
  means: Mean[]
  notes: string[]
}

interface Mean {
  "idiom-jp": string
  synonyms?: string[]
  "example-sentence": string
  "sentence-jp": string
}

// 出題設定
interface QuizSettings {
  startNumber: number
  endNumber: number
  mode: "idiom" | "sentence"       // 熟語 or 例文
  target: "all" | "incorrect"      // すべて or 間違えたもの
  order: "sequential" | "random"   // 番号順 or ランダム
}

// 1問分の出題データ
interface QuizItem {
  number: string          // 熟語番号 "0001"
  idiomData: IdiomData    // 元データ
  questionText: string    // 出題テキスト
  idiomIndex?: number     // 熟語が複数ある場合のインデックス
  meanIndex?: number      // 例文出題時の意味インデックス
}

// セッション状態
interface QuizSession {
  settings: QuizSettings
  items: QuizItem[]
  currentIndex: number
  results: Record<number, boolean>  // index → 正解/不正解
}

// localStorage に保存する履歴
// key: "history:{number}" or "history:{number}:{idiomIndex}"
// value: boolean (true=正解, false=不正解)
```

## localStorage 設計

| キー | 値 | 用途 |
|---|---|---|
| `idiom-history` | `Record<string, boolean>` | 各熟語の最新回答。キーは `"{number}"` または `"{number}-{idiomIndex}"` |
| `idiom-session` | `QuizSession \| null` | 中断中のセッション（再開用） |

## データ取得フロー

1. トップページで「開始」押下
2. GitHub Contents API で `target/` ディレクトリのファイル一覧を取得
3. 指定範囲のJSONファイル名をフィルタ（例: `0001.json` ～ `0100.json`）
4. 各JSONファイルを Raw URL で取得
5. 出題リストを生成してセッション保存し、出題画面へ遷移
6. 回答表示時に `supplement/{番号}-add.md` を Raw URL で取得
7. 取得できた場合のみ Markdown 内の相対画像パス (`./img/xxx.png`) を Raw URL に変換し、HTML化して表示
8. 取得済みの補足HTMLは番号単位でメモリキャッシュする

## 実装手順

### Phase 1: プロジェクト基盤
1. Vue 3 + Vite プロジェクトの初期化（TypeScript）
2. Vuetify のインストール・設定
3. Vue Router の設定（3画面分）
4. 型定義ファイルの作成
5. config.ts の作成（GitHubリポジトリのオーナー名・リポジトリ名・ブランチ名）

### Phase 2: データ層
6. `useGitHubData.ts` — GitHub API でファイル一覧取得、Raw URL でファイル取得
7. `useHistory.ts` — localStorage への正解/不正解履歴の読み書き・クリア
8. `useQuizSession.ts` — 設定に基づく出題リスト生成、セッション保存・復元

### Phase 3: 画面実装
9. `HomeView.vue` — 出題設定フォーム、中断セッション再開ボタン、履歴クリア
10. `QuizView.vue` + `QuizQuestion.vue` + `QuizAnswer.vue` — 出題・回答表示・正解不正解判定
11. `ProgressBar.vue` — 進捗インジケーター
12. `SupplementContent.vue` — 回答表示時の補足Markdown取得、Markdown → HTML 変換表示（marked 等のライブラリ使用）
13. `ResultView.vue` — 結果サマリー、3つのアクションボタン

### Phase 4: モバイル対応
14. スワイプ操作の実装（touch イベント or ライブラリ）
15. レスポンシブ対応の確認・調整

### Phase 5: デプロイ
16. GitHub Actions ワークフロー作成（build → gh-pages へ push）
17. 動作確認

## 依存ライブラリ（想定）

| パッケージ | 用途 |
|---|---|
| vue | フレームワーク |
| vuetify | UIコンポーネント |
| vue-router | ルーティング |
| marked | Markdown → HTML 変換 |
| @mdi/font | Material Design Icons（Vuetify用） |

## 備考
- GitHub API のレート制限（認証なし60回/時）に注意。100個のファイルを個別取得すると1セッションで60リクエストを超える可能性がある。
  - 対策案: JSON データはまとめて取得できるよう、`target/` 配下を一括取得する API 呼び出しを最小限にする。Contents API は1ディレクトリで最大1000ファイルのメタデータを返すため、一覧取得は1回で済む。個別ファイル取得は Raw URL（CDN経由）なのでレート制限の影響は小さい。
