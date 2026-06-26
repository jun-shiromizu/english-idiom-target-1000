# Issue #75 実装計画

## 目的

- トップページから遷移できる新モードとして「バトル」を追加する。
- ユーザーは 5 人編成のデッキを作成し、ダンジョンを選択して、ターン制バトルを進める。
- ユーザー側の攻撃は既存の落ち物ゲームを土台にし、スキル発動は既存の 4 択 UI を土台にして実装する。
- 味方キャラクターと敵キャラクター、ダンジョン構成は JSON データで管理する。

## 前提整理

### 既存実装で再利用できるもの

- ホーム画面には既に学習モード選択とルーティングがあり、ここに「バトル」導線を追加できる。
- 既存の落ち物ゲーム画面には、進捗表示、スコア計算、4 択選択、結果一覧の土台がある。
- 既存の例文穴埋めモードには、4 択出題と正誤判定の流れがある。
- 既存のセッション保存は localStorage ベースで行われているため、バトル専用セッションも同じ方針で実装できる。

### この Issue で新規に必要なもの

- デッキ作成画面
- ダンジョン選択画面
- バトル用のドメインモデルとターン進行ロジック
- リーダースキルとアクティブスキルの定義・適用処理
- 味方／敵／ダンジョン JSON の読み込み基盤
- バトル用の結果画面

## 仕様確定事項

- バトル用 JSON は既存のデータリポジトリ english-idiom-target-1000-data の main ブランチに配置する。
- 落ち物ゲームのスコアは、そのまま敵へのダメージとする。
- MVP のリーダースキルとアクティブスキルは固定数に絞って実装する。
- スキル発動用の 4 択問題は、既存の落ち物ゲームと同じ選択肢生成ロジックを使う。
- デッキは localStorage に保存し、次回以降も使い回せる仕様にする。

## 実装方針

- バトルは既存の通常学習セッションとは分離し、専用の sessionType と localStorage キーを持つ。
- バトル用データは JSON で定義し、既存データリポジトリからランタイム取得する。
- MVP では、リーダースキルとスキルを「効果種別 + 数値パラメータ」の組み合わせで表現し、個別の if 文地獄を避ける。
- MVP では、敵は単体出現のみとし、1 ダンジョンは複数 wave で構成する。
- デッキ編成は 1 リーダー + 4 メンバー固定、同一キャラは重複不可で設計する。
- スキル発動用の 4 択は battle 専用問題を持たず、既存の useGameChoices.ts のロジックを共通化して再利用する。

## 画面構成案

| # | 画面 | パス案 | 役割 |
|---|---|---|---|
| 1 | トップページ | / | 「バトル」導線を追加 |
| 2 | デッキ作成 | /battle/deck | キャラクター一覧、リーダー選択、メンバー 4 人選択 |
| 3 | ダンジョン選択 | /battle/dungeons | ダンジョン一覧、難易度・wave 情報表示、選択確定 |
| 4 | バトル | /battle/play | 敵表示、味方 HP、ターン進行、落ち物ゲーム、スキル発動 |
| 5 | バトル結果 | /battle/result | クリア / 敗北結果、到達 wave、使用デッキ、再挑戦 |

## コンポーネント / composable 構成案

### 追加 View

- src/views/BattleDeckView.vue
- src/views/BattleDungeonView.vue
- src/views/BattleView.vue
- src/views/BattleResultView.vue

### 追加 Component

- src/components/battle/BattleCharacterCard.vue
- src/components/battle/BattleDeckSlot.vue
- src/components/battle/BattleEnemyPanel.vue
- src/components/battle/BattlePartyPanel.vue
- src/components/battle/BattleSkillDialog.vue
- src/components/battle/BattleTurnSummary.vue

### 追加 Composable

- src/composables/useBattleData.ts
	- キャラクター / ダンジョン JSON 取得
- src/composables/useBattleSession.ts
	- デッキ選択、ダンジョン選択、進行中バトル状態の保存 / 復元
- src/composables/useBattleEngine.ts
	- ターン進行、ダメージ計算、勝敗判定、スキルターン管理
- src/composables/useBattleSkills.ts
	- リーダースキル / アクティブスキルの適用

### 既存流用候補

- src/views/HomeView.vue
	- バトル導線追加
- src/main.ts
	- ルート追加
- src/composables/useGameChoices.ts
	- 落ち物ゲーム / 4 択候補生成の再利用可否を確認
- src/views/GameView.vue
	- UI / スコア / 一時停止まわりの再利用方針を整理

## 型定義案

### バトルデータ

```ts
type BattleEffectType =
	| 'atk-multiplier'
	| 'hp-multiplier'
	| 'game-difficulty'
	| 'heal'
	| 'damage-cut'
	| 'skill-boost'

interface BattleSkillEffect {
	effectType: BattleEffectType
	value: number | string
	durationTurns?: number
}

interface BattleLeaderSkill {
	id: string
	name: string
	effects: BattleSkillEffect[]
	description: string
}

interface BattleActiveSkill {
	id: string
	name: string
	effects: BattleSkillEffect[]
	cooldownTurns: number
	description: string
}

interface BattleCharacter {
	id: string
	name: string
	icon: string
	rarity?: string
	atk: number
	hp: number
	leaderSkill: BattleLeaderSkill
	activeSkill: BattleActiveSkill
}

interface BattleEnemy {
	id: string
	name: string
	icon?: string
	atk: number
	hp: number
	rewardScore?: number
}

interface BattleDungeon {
	id: string
	name: string
	description?: string
	enemies: BattleEnemy[]
}
```

### effectType 一覧

leaderSkill と activeSkill は同じ BattleEffectType を使う。違いは「いつ適用するか」で、leaderSkill は主にバトル開始時の常時効果、activeSkill は発動時の一時効果または即時効果を想定する。

- 1 つのスキルは `effects` 配列で 1 個以上の BattleSkillEffect を持てる。
- 単一効果のスキルも、複合効果のスキルも同じ構造で表現する。
- `durationTurns` は継続効果が必要な effect だけに付ける。

| effectType | 主な用途 | value の意味 | 説明 |
|---|---|---|---|
| atk-multiplier | leaderSkill / activeSkill | 数値 | 味方の攻撃力倍率。`2` なら与ダメージ計算時の攻撃側補正を 2 倍にする。 |
| hp-multiplier | leaderSkill | 数値 | 味方の最大 HP 倍率。`2` ならバトル開始時の最大 HP と初期 HP を 2 倍にする。 |
| game-difficulty | leaderSkill / activeSkill | 文字列 | 落ち物ゲームの難易度補正。`easy` や `hard` を指定し、落下速度などのゲームパラメータへ反映する。 |
| heal | activeSkill | 数値 | 回復量。`0.1` なら最大 HP の 10% 回復、`120` のような整数なら固定値回復、のように実装で扱う想定。 |
| damage-cut | activeSkill | 数値 | 被ダメージ軽減率。`0.5` ならそのターン中に受けるダメージを半減する。 |
| skill-boost | activeSkill | 数値 | スキル再使用短縮量。`1` なら味方全員の残りクールダウンを 1 ターン減らす。 |

MVP ではこの 6 種だけを扱い、個別キャラ専用の特殊効果は追加しない。

### 複合効果の表現例

「難易度が hard になるが攻撃力 2 倍」のようなスキルは、1 スキルの中に effect を 2 つ入れて表現する。

```json
{
	"id": "leader-hard-atk-2x",
	"name": "狂戦士の采配",
	"effects": [
		{ "effectType": "game-difficulty", "value": "hard" },
		{ "effectType": "atk-multiplier", "value": 2 }
	],
	"description": "落ち物ゲームの難易度が hard になる代わりに、味方全体の攻撃力を 2 倍にする"
}
```

この方式なら、「1 ターンだけ hard になるが攻撃力 2 倍」のような activeSkill も次のように表現できる。

```json
{
	"id": "skill-hard-atk-2x",
	"name": "捨て身の突撃",
	"effects": [
		{ "effectType": "game-difficulty", "value": "hard", "durationTurns": 1 },
		{ "effectType": "atk-multiplier", "value": 2, "durationTurns": 1 }
	],
	"cooldownTurns": 5,
	"description": "1 ターンの間、難易度を hard にする代わりに攻撃力を 2 倍にする"
}
```

### 進行状態

```ts
interface BattleDeck {
	leaderId: string
	memberIds: string[]
}

interface BattlePartyMemberState {
	characterId: string
	currentHp: number
	skillCooldownRemaining: number
}

interface BattleEffectState {
	sourceId: string
	effectType: BattleEffectType
	value: number | string
	remainingTurns: number
}

interface BattleSession {
	sessionType: 'battle'
	deck: BattleDeck
	dungeonId: string
	currentWaveIndex: number
	turn: number
	score: number
	party: BattlePartyMemberState[]
	enemyCurrentHp: number
	activeEffects: BattleEffectState[]
	pendingSkillCharacterId?: string
	lastFallingGameScore?: number
	status: 'deck-building' | 'dungeon-select' | 'in-battle' | 'cleared' | 'defeated'
}
```

## JSON 配置と構成

### 配置先

- リポジトリ: jun-shiromizu/english-idiom-target-1000-data
- ブランチ: main
- ルートパス: battle

### ファイル / ディレクトリ構成

```text
english-idiom-target-1000-data/
	battle/
		characters.json
		dungeons.json
		icons/
			characters/
				hero-001.png
				hero-002.png
			enemies/
				slime.png
				bat.png
				ogre.png
```

### 役割

- battle/characters.json
	- 味方キャラクターの一覧。
	- リーダースキル、アクティブスキル、基礎ステータス、アイコンパスを持つ。
- battle/dungeons.json
	- ダンジョン一覧。
	- 各ダンジョンの wave 構成と敵ステータスを持つ。
- battle/icons/characters/*.png
	- 味方キャラクターのアイコン画像。
- battle/icons/enemies/*.png
	- 敵キャラクターのアイコン画像。

### JSON 内のパス表現ルール

- icon フィールドには data repo ルート基準の相対パスを入れる。
- 例:
	- characters.json のキャラクター画像: battle/icons/characters/hero-001.png
	- dungeons.json の敵画像: battle/icons/enemies/slime.png
- アプリ側では既存の Raw URL 生成ロジックと同じ考え方でフル URL に変換して表示する。

### characters.json 例

```json
[
	{
		"id": "hero-001",
		"name": "ブレイズ",
		"icon": "battle/icons/characters/hero-001.png",
		"atk": 120,
		"hp": 980,
		"leaderSkill": {
			"id": "leader-atk-2x",
			"name": "猛攻の号令",
			"effects": [
				{ "effectType": "atk-multiplier", "value": 2 }
			],
			"description": "味方全体の攻撃力を 2 倍にする"
		},
		"activeSkill": {
			"id": "skill-heal-10",
			"name": "小回復",
			"effects": [
				{ "effectType": "heal", "value": 0.1 }
			],
			"cooldownTurns": 5,
			"description": "最大 HP の 10% を回復する"
		}
	}
]
```

### dungeons.json 例

```json
[
	{
		"id": "dungeon-001",
		"name": "はじまりの洞窟",
		"description": "基本ルール確認用の入門ダンジョン",
		"enemies": [
			{ "id": "slime", "name": "スライム", "icon": "battle/icons/enemies/slime.png", "atk": 40, "hp": 180 },
			{ "id": "bat", "name": "ドラキー", "icon": "battle/icons/enemies/dracky.png", "atk": 55, "hp": 220 },
			{ "id": "ogre", "name": "オーガ", "icon": "battle/icons/enemies/ogre.png", "atk": 80, "hp": 420 }
		]
	}
]
```

### MVP の初期データ方針

- characters.json は MVP では固定数のキャラクターだけを持つ。
- dungeons.json は MVP では少数のダンジョンだけを持つ。
- スキル種別は effectType の有限パターンに収まるものだけを採用する。

## バトル進行仕様案

### 1. デッキ作成

- キャラクター一覧を表示する。
- ユーザーは 1 人をリーダーに設定し、追加で 4 人をメンバーに選ぶ。
- 「デッキ決定」でデッキ状態を保存し、ダンジョン選択へ進む。

### 2. ダンジョン選択

- ダンジョン一覧を表示する。
- 各ダンジョンで wave 数、ボス有無、想定難易度を表示する。
- 「ダンジョン決定」で battle session を初期化してバトル開始。

### 3. ターン進行

1. プレイヤーターン開始
2. アクティブな継続効果の残りターンを更新
3. 使用可能スキルがあれば選択 UI を出す
4. 攻撃フェーズとして落ち物ゲームを実行
5. 落ち物ゲームで得たスコア値を、そのままダメージとして敵 HP を減少
6. 敵 HP が 0 以下なら次 wave へ、最後ならクリア
7. 敵ターンで敵 ATK に応じたダメージをパーティへ適用
8. パーティ合計 HP が 0 以下なら敗北
9. 次ターンへ進む

### 4. リーダースキル

- バトル開始時に自動適用する。
- 実装は「永続効果」または「battle difficulty modifier」として engine に反映する。
- 例:
	- 攻撃力 2 倍
	- HP 2 倍
	- ハードモード化 + 攻撃力 4 倍
	- イージーモード化

### 5. アクティブスキル

- 各キャラは固有スキルとクールダウンを持つ。
- 所定ターン経過後のみ使用可能。
- スキル選択後、既存の落ち物ゲームと同じロジックで 4 択問題を 1 問出し、正解時のみ効果発動。
- 正解 / 不正解にかかわらずクールダウンは再消費する。
- 例:
	- 1 ターン攻撃力 2 倍
	- 最大 HP の 10% 回復
	- 1 ターン被ダメージ半減
	- 1 ターンだけ落ち物ゲームをイージー化
	- 全員の残りクールダウンを 1 減少

## 既存機能との接続方針

### HomeView

- 既存の「単語帳 / 書き取り / 例文穴埋め / タイピング / ゲーム」に加え、「バトル」ボタンを追加する。
- バトルは通常の出題設定とは入力項目が異なるため、開始前にそのまま deck 作成画面へ遷移する。
- 保存済み battle session がある場合は、通常セッションとは別枠で再開導線を出す。

### 既存の落ち物ゲーム

- 既存 GameView を直接拡張しすぎると責務が混ざるため、MVP では battle 専用画面を用意する。
- ただし以下は切り出して再利用する。
	- 難易度定義
	- 落下速度設定
	- スコア加算の基本ロジック
	- 4 択選択 UI の見た目 / 操作感

### セッション保存

- 既存 useQuizSession.ts に無理に battle を混ぜず、useBattleSession.ts を新設する。
- 保存キーは既存キーと分離する。
	- 例: idiom-app-battle-session
	- 例: idiom-app-battle-deck
- デッキは進行中セッションがなくても残し、次回のデッキ作成画面で初期値として復元する。

## 実装フェーズ

### Phase 1: 仕様固定とデータ定義

1. battle/characters.json と battle/dungeons.json の JSON スキーマ確定
2. アイコン相対パスの運用ルールを確定
3. 効果種別一覧を確定
4. MVP 対象キャラ数 / ダンジョン数を確定

### Phase 2: ドメイン層の実装

5. src/types/index.ts に battle 系型を追加
6. src/composables/useBattleData.ts を作成
7. src/composables/useBattleSkills.ts を作成
8. src/composables/useBattleEngine.ts を作成
9. src/composables/useBattleSession.ts を作成

### Phase 3: 画面遷移と UI 骨格

10. src/main.ts に battle ルート群を追加
11. src/views/HomeView.vue に「バトル」導線と再開導線を追加
12. src/views/BattleDeckView.vue を実装
13. src/views/BattleDungeonView.vue を実装
14. src/views/BattleResultView.vue を実装

### Phase 4: バトル本体

15. src/views/BattleView.vue を実装
16. 落ち物ゲームの攻撃フェーズを組み込む
17. wave 切り替え、勝敗判定、敵ターン処理を組み込む
18. 一時停止 / 中断 / 再開を実装

### Phase 5: スキルシステム

19. リーダースキル自動適用を実装
20. アクティブスキルのクールダウン管理を実装
21. 4 択成功時のみスキル発動するフローを実装
22. 継続効果の残りターン管理を実装

### Phase 6: テストとドキュメント

23. battle composable のユニットテストを追加
24. battle view / component のユニットテストを追加
25. specs/ と tests/e2e/ に battle フローのシナリオを追加
26. docs/spec.md に battle モード仕様を追記

## テスト計画

### ユニットテスト

- useBattleEngine
	- プレイヤー攻撃で敵 HP が減る
	- 敵撃破で次 wave に進む
	- 最終 wave 撃破で clear になる
	- 被ダメージで全滅したら defeat になる
	- 継続効果の残りターンが正しく減る
- useBattleSkills
	- リーダースキルが初期状態に反映される
	- クールダウン未到達では使用不可
	- スキル失敗時も再チャージが始まる
- useBattleSession
	- デッキ保存 / 復元
	- 途中中断 / 再開

### コンポーネント / View テスト

- BattleDeckView
	- リーダー 1 人 + メンバー 4 人未満では確定不可
	- 確定後にダンジョン選択へ遷移
- BattleDungeonView
	- ダンジョン選択後に session 初期化
- BattleView
	- スコア反映
	- wave 遷移
	- スキルダイアログ表示
	- 中断ダイアログと再開

### E2E テスト

- トップページからバトル開始
- デッキ作成 → ダンジョン選択 → バトル開始
- 敵撃破で次 wave へ進む
- 全滅で敗北画面へ遷移
- スキル使用時に 4 択成功で効果が発動する

## PR の分け方案

1. データ仕様 + 型 + composable
2. デッキ作成 / ダンジョン選択 UI
3. バトル本体
4. スキルシステム
5. テスト / docs / 調整

## 主なリスク

- リーダースキルとアクティブスキルを自由形式で作ると分岐が急増する。
	- 対策: effectType ベースの有限パターンで実装する。
- 既存 GameView を流用しすぎると通常ゲームと battle の責務が衝突する。
	- 対策: battle 用 View は分離し、共通ロジックだけ composable 化する。
- バランス調整は実装後に大きく手戻りしやすい。
	- 対策: まずは固定の MVP 数値で通し、後で JSON だけで調整できる構造にする。
- 既存の book データ取得設計とは別系統の battle データ取得ルートが必要になる。
	- 対策: src/config.ts に battle 用 repo/path 定数を追加し、useBattleData.ts で責務を分離する。

## 最初の着手順

最初の 1 PR では以下に絞るのが妥当。

1. battle 用 JSON スキーマを決める
2. battle 系型を追加する
3. useBattleSession.ts / useBattleData.ts の雛形を作る
4. デッキ作成画面とダンジョン選択画面までつなぐ

この段階で「バトル開始前までの導線」と「データ構造」が固まるため、以後のバトル本体実装を安全に分割できる。
