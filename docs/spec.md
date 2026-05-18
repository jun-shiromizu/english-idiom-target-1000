# ターゲット暗記アプリ

- 高校生向けの英単語・英熟語暗記アプリ
- ユーザは暗記カードのように問題を解く
- 学習モードとして、通常の単語帳モードと4択の落ち物ゲームモードを提供する

## データ
- 基本的に「旺文社・英熟語ターゲット1000」と「英単語ターゲット1900」を利用する
- 各教材のデータは、GitHub 上の public データリポジトリに教材ごとのディレクトリを分けて格納しておく
- 将来的に他の書籍由来のデータを追加する場合も同様に教材ディレクトリを増やして対応する
- データの取得方法
  - 毎回GitHubからランタイムで取得する（ローカルキャッシュは行わない）
  - ディレクトリ内のファイル一覧取得には GitHub Contents API を使用する
  - 個々のファイル内容の取得には GitHub Raw URL を使用する
- 各教材ディレクトリ配下のデータは基本的に以下の形式

  - 基本形

```json
0001.json
{
  "idioms": [
    "a piece of ~"
  ],
  "means": [
    {
      "idiom-jp": "１つの～",
      "partOfSpeech": "phrase",
      "choiceType": "quantity-expression",
      "example-sentence": "I handed him a piece of paper so that he could write down all the names.",
      "sentence-jp": "彼がすべての名前を書けるように私は彼に1枚の紙を手渡した。"
    }
  ],
  "notes": [
    "不可算名詞を「数量化」する最も一般的な句。",
    "「数量化」を表す他の例は「深める」P.74。"
  ]
}
```

  - 意味が2つ、それぞれに対応する例文が存在。

```json

0002.json
{
  "idioms": [
    "a couple of ~"
  ],
  "means": [
    {
      "idiom-jp": "２つの～",
      "partOfSpeech": "phrase",
      "choiceType": "quantity-expression",
      "synonyms": ["two"],
      "example-sentence": "My mother wanted me to byu a couple of sandwiches on my way home.",
      "sentence-jp": "母は私に、帰宅の途中で2個のサンドイッチを買ってきてもらいたかった。"
    },
    {
      "idiom-jp": "２、３の～",
      "partOfSpeech": "phrase",
      "choiceType": "quantity-expression",
      "synonyms": ["a few ~"],
      "example-sentence": "Take a couple of sweaters with you; it might be cold up there.",
      "sentence-jp": "２、３枚のセーターを持っていきなさい。その上の方は寒いかもしれません。"
    }
  ],
  "notes": [
    "①②の区別が明確でない場合も多い。米ではofが省略されることもある。"
  ]
}
```

  - 熟語が2つ

```json
0006.json
{
  "idioms": [
    "a great deal of ~",
    "a good deal of ~"
  ],
  "means": [
    {
      "idiom-jp": "たくさん(の～)",
      "partOfSpeech": "phrase",
      "choiceType": "quantity-expression",
      "example-sentence": "The recent typhoon did a great deal of damage to rice crops.",
      "sentence-jp": "先ごろの台風は米作に大きな被害を与えた。"
    }
  ],
  "notes": [
    "後には不可算名詞がくる。 a great[good] deal は副詞句・名詞句としても使う。"
  ]
}
```

- 各教材の補足データ
  - ファイル名は `{番号}-add.md` の固定形式（例: `0001-add.md`）。
  - システムは回答表示時に該当番号の補足Markdownを取得し、HTMLに変換して表示する。
  - 番号によっては、補足データが存在しない場合もある。
  - ファイルはMarkdownファイルで、場合によっては画像ファイルへのリンクが存在する場合もある。
  - 画像もGitHub上に配置する。Markdown中の相対パス（例: `./img/1234-bar-foo.png`）はアプリ側でGitHub Raw URLのフルパスに変換して表示する。

```markdown
### 由来
bring「手に持っている」＋up「大きくする」 → 手の中で大きくする → ～を育てる
```

```markdown
### イメージ
![](./img/1234-bar-foo.png)
```

- `means[]` には、ゲームの選択肢生成で使う分類メタデータを任意で持たせる。
  - `partOfSpeech` は表示・分析用の大分類。
    - 例: `noun`, `verb`, `adjective`, `adverb`, `preposition`, `conjunction`, `phrase`, `other`
  - `choiceType` は落ち物ゲームなどで「紛らわしい選択肢」を選ぶための分類。
    - 例: `transitive-verb`, `intransitive-verb`, `verb-phrase`, `noun`, `adjective`, `adverb`, `prepositional-phrase`, `conjunction-phrase`, `quantity-expression`, `comparative-expression`, `idiomatic-expression`, `other`
  - システムは `choiceType` が存在する場合はそれを優先し、存在しない古いデータでは日本語の意味から推定する。

## 機能
- トップページでは以下の操作が可能
  - 出題設定を行う
  - 保存済みセッションがあれば再開する、または破棄する
  - 不正解履歴を全件クリアする
  - テーマ設定画面へ移動する
- ユーザは開始時に以下を設定し、「開始」を押す
  - 教材
    - 英熟語ターゲット1000
    - 英単語ターゲット1900
  - 開始番号と終了番号（例えば 1 ~ 100）：出題する熟語番号の範囲
  - 出題形式
    - 熟語（英語 --> 日本語）
    - 例文（英語 --> 日本語）
  - 出題対象
    - 間違えたものだけ（その熟語に対する最新の回答が不正解だったもの）
    - すべて
  - 出題順序
    - 番号順
    - ランダム
  - ゲーム難易度
    - イージー
    - ノーマル
    - ハード
- 開始時に以下の2つの学習モードから選択する
  - 単語帳
  - 落ち物ゲーム

### 単語帳モード

- システムは、設定された条件に従って問題と回答を準備し、以下を繰り返す
- システムは問題を表示する
  - 出題形式が「熟語（英語 --> 日本語）」の場合
    - 意味が複数ある場合、ユーザに両方の意味を答えさせるため「いくつ答えるべきか」も示す。
      - 例："a piece of ~ (1)"
      - 例："a couple of ~ (2)"
    - 熟語が複数ある場合、それぞれで別に出題する。
      - 例："a great deal of ~(1)", "a good deal of ~(1)"
  - 出題形式が「熟語（例文 --> 日本語）」の場合
    - 意味が複数ある場合、それぞれで別に出題する。
      - 例："My mother wanted me to by ~", "Take a couple of sweaters wit ~"
- ユーザは回答を頭の中で考えたら、画面をタップ、またはクリックする
- システムは回答を表示する
  - 出題形式が「熟語（英語 --> 日本語）」の場合、以下のようなイメージで表示する（Markdownで表現しているが、HTMLで表示する）

```markdown
## {熟語番号}
### 熟語
[idioms]

### 意味
1. {means[1].idiom-jp}
  - 同義語：[means[1].synonyms]
2. {means[2].idiom-jp}
  - 同義語：[means[2].synonyms]

### 例文
1. {means[1].example-sentence}
  - {means[1].sentence-jp}
2. {means[2].example-sentence}
  - {means[2].sentence-jp}

### 補足説明
- {notes[1]}
- {notes[2]}

<<英熟語ターゲット以外のデータファイルの内容>>

```

  - 出題形式が「熟語（例文 --> 日本語）」の場合、以下のようなイメージで表示する（Markdownで表現しているが、HTMLで表示する）

```markdown
## {熟語番号}
### 例文
{means[2].example-sentence}

### 例文訳
{means[2].sentence-jp}

### 熟語
[idioms]

### 意味
1. {means[1].idiom-jp}
  - 同義語：[means[1].synonyms]
2. {means[2].idiom-jp}
  - 同義語：[means[2].synonyms]

### 補足説明
- {notes[1]}
- {notes[2]}

<<英熟語ターゲット以外のデータファイルの内容>>

```

- 出題中は進捗インジケーターを表示する（例：「5 / 30問目」）
- ユーザは頭の中で考えた回答と照らし合わせ「正解」ボタンまたは「不正解」ボタンを押す
  - モバイル：正解の代わりに右スワイプ、不正解の代わりに左スワイプでもよい。ただし縦スクロール中の誤判定を避けるため、ほぼ真横の大きなスワイプだけを判定対象にする。スワイプ中はカードを横方向に追従させ、右方向は「正解」、左方向は「不正解」のフィードバックを表示する。
  - PC：ボタン操作のみ
- システムは回答操作のたびに正解・不正解データを localStorage に保存する
  - 最新の回答結果のみを保持する
  - 複数の熟語や複数の意味を持つデータは、出題単位ごとに判定を持つ

- セッションの途中終了
  - ユーザはいつでもセッションを中断できる
  - 進捗（何問目まで回答したか、各問の正解/不正解）は localStorage に保存し、トップページから再開可能とする
  - 保存済みセッションはトップページから破棄できる

- セッション終了時（全問出題完了後）
  - 結果サマリー画面を表示する（正解数/出題数、正解率など）
  - サマリー画面から以下の操作が可能
    - 「トップページへ」戻る
    - 「間違えたところをやり直す」（不正解の問題だけ再出題）
    - 「間違いデータをクリアしてもう一度」（該当範囲の不正解履歴をクリアして最初から）

### 落ち物ゲームモード

- 開始時に出題条件から問題集合を準備し、各設問に対して4択の選択肢を生成する
- 問題文は画面上部から下方向へ落下する
- ユーザは4つの選択肢から正解を選ぶ
- ゲーム中は以下を表示する
  - スコア
  - 進捗インジケーター
  - コンボ数
  - ミス数
  - 難易度表示
- 正解時はスコア加算とコンボ加算を行い、問題の落下位置を押し戻す
- 不正解時はミスとして扱い、落下位置が進む
- ゲーム中は一時停止と終了ができる
- 画面下部の危険ラインに到達した時点でゲームオーバーとする
- 全問を最後までさばいた場合はゲームクリアとする
- 終了後は結果画面を表示し、以下を確認できる
  - スコア
  - 正解数
  - ミス数
  - 教材、番号範囲、出題形式、出題対象、出題順序、ゲーム難易度
  - 間違えた問題の一覧（問題文と正解）
- 落ち物ゲームは4択を構成するため、出題可能な問題数が4問未満の場合は開始できない

- システムは正解・不正解データを localStorage に保存する
  - 最新の回答結果のみを保持する
  - 複数の熟語や複数の意味を持つデータは、出題単位ごとに判定を持つ

- 不正解履歴のリセット
  - トップページに不正解履歴をクリアする機能を設ける

### テーマ設定

- ユーザは専用のテーマ設定画面で、アプリ全体の外観テーマを変更できる
- テーマは配色のみ、背景演出あり、アニメーション背景、ダークテーマなどの分類で絞り込みできる
- テーマの選択結果は保存され、次回アクセス時にも前回のテーマを引き継ぐ
- 背景演出やアニメーションはアプリ全体に適用される
- 端末が reduced motion を要求している場合、アニメーション背景は抑制する



## システム
- ユーザ端末はPCおよび、iPad、スマートフォンを想定する
- ブラウザ経由でアクセスする
- 認証は不要。URLを知っている人は誰でも利用可能
- 正解・不正解データ、出題設定、保存セッション、ゲーム難易度、テーマ設定は localStorage で端末ごとに管理する（サーバー側DB不要）
  - マルチデバイス同期は行わない
- オフライン対応（PWA）は行わない
- 管理画面は不要。データはGitHub上で直接編集する
- 想定利用規模：家族内利用、少数の友人程度
- Webアプリは以下の技術で開発する
  - Vue 3
  - Vuetify（UIコンポーネント・スタイリングの主軸）
  - GitHub Pages（静的ホスティング）
- 将来的に正解率・学習履歴の統計画面を追加する可能性がある

## リポジトリ構成

2つのリポジトリに分離する。

### アプリリポジトリ（本リポジトリ）
- リポジトリ名: `english-idiom-target-1000`
- 内容: Vue アプリのソースコード、設計ドキュメント
- 公開: public（GitHub Pages で配信するため）
- 構成:
  ```
  english-idiom-target-1000/
  ├── src/          … Vue ソースコード
  ├── docs/         … 設計ドキュメント（spec.md など）
  ├── package.json
  └── ...
  ```

### データリポジトリ
- リポジトリ名: `english-idiom-target-1000-data`
- 内容: 各教材のJSONデータ、補足Markdown、画像
- 公開: public（アプリからRaw URLで取得するため）
- 構成:
  ```
  english-idiom-target-1000-data/
  ├── idiom-target-1000/
  │   ├── target/       … 英熟語ターゲット1000 の JSON データ
  │   │   ├── 0001.json
  │   │   └── ...
  │   ├── supplement/   … 補足データ（Markdown）
  │   │   ├── 0001-add.md
  │   │   └── ...
  │   └── img/          … 補足データ用の画像
  └── word-target-1900/
      ├── target/       … 英単語ターゲット1900 の JSON データ
      │   ├── 0001.json
      │   └── ...
      ├── supplement/
      │   ├── 0001-add.md
      │   └── ...
      └── img/
  ```

### デプロイ
- アプリリポジトリで `npm run build` した成果物を `gh-pages` ブランチに push して公開する
- GitHub Actions で型チェック、ユニットテスト、E2E テスト、ビルド、デプロイを実行する
- デプロイ workflow は手動実行とし、`gh-pages` ブランチへ反映する
- 公開URL: `https://{GitHubユーザー名}.github.io/english-idiom-target-1000/`

### データへのアクセス
- ディレクトリ内のファイル一覧取得には GitHub Contents API を使用する
  - 例: `https://api.github.com/repos/{owner}/english-idiom-target-1000-data/contents/idiom-target-1000/target/`
- 個々のファイル内容の取得には GitHub Raw URL を使用する
  - 例: `https://raw.githubusercontent.com/{owner}/english-idiom-target-1000-data/main/idiom-target-1000/target/0001.json`
  - 例: `https://raw.githubusercontent.com/{owner}/english-idiom-target-1000-data/main/idiom-target-1000/supplement/0001-add.md`
- 補足データ内の画像の相対パス（`./img/xxx.png`）はアプリ側でRaw URLのフルパスに変換して表示する
