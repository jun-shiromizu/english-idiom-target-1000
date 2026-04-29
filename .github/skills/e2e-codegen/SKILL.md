---
name: e2e-codegen
description: 'E2Eテスト仕様（YAML）からPlaywrightテストコード（.spec.ts）を生成する。Use when テストコードを生成する、specからコードを作る、YAMLからテストを実装する、テストを実装して、と依頼されたとき。'
---

# E2Eテストコード生成

`specs/` 配下の YAML 仕様から、Playwright テストコード (`tests/*.spec.ts`) を生成する。

## When to Use This Skill

- specs に新しい YAML が追加されたとき
- 「テストコードを生成して」「spec から実装して」と依頼されたとき
- テスト仕様が変更され、コードを再生成する必要があるとき

## 設計ガイド

パスマッピング・ロケータ方針・証跡タイミング等の詳細な設計方針は `.e2e-test-auto/02_e2e-codegen.md` を参照すること。

## 入出力

specs のフォルダ構造をそのまま tests にミラーする。

- **入力**: `specs/<画面>/<アクション>.yaml`
- **出力**: `tests/<画面>/<アクション>.spec.ts`

```
specs/login/login-success.yaml  →  tests/login/login-success.spec.ts
specs/login/login-error.yaml    →  tests/login/login-error.spec.ts
specs/inventory/add-to-cart.yaml → tests/inventory/add-to-cart.spec.ts
```

## コード生成ルール

### 1. セマンティックロケータを使う（必須）

DOM セレクタではなく、Playwright のセマンティックロケータを優先する。

**優先順位:**
1. `getByRole()` - ボタン、リンク、テキストボックス等
2. `getByLabel()` - フォーム入力フィールド
3. `getByPlaceholder()` - プレースホルダーテキスト
4. `getByText()` - 表示テキスト
5. `getByTestId()` - 上記で特定できない場合の最終手段

```typescript
// ✅ 良い例
await page.getByRole('button', { name: 'Login' }).click();
await page.getByPlaceholder('Username').fill('standard_user');

// ❌ 悪い例
await page.locator('#login-button').click();
await page.locator('input[data-test="username"]').fill('standard_user');
```

### 2. fixture を活用する

- YAML の `precondition` に対応する fixture を `fixtures/_preconditions.yaml`（precondition カタログ）から特定する
- テストデータは `fixtures/test-data.ts` から import する

**precondition → fixture のマッピング:**

コード生成時は必ず `fixtures/_preconditions.yaml` を参照し、precondition の key に対応する fixture 名を使う。

```yaml
# _preconditions.yaml の例
- key: "未ログイン状態"
  fixture: page
- key: "standard_userでログイン済み"
  fixture: loggedInPage
```

```typescript
// precondition: "未ログイン状態" → page（標準）
import { test, expect } from '@playwright/test';

// precondition: "standard_userでログイン済み" → loggedInPage
import { test, expect } from '../../fixtures/base';
test('...', async ({ loggedInPage: page }) => { ... });
```

- カタログに対応する precondition がない場合はコード生成を中断し、fixture の追加を促す
- テストデータは `fixtures/test-data.ts` から import する

```typescript
import { PRODUCTS, CHECKOUT_INFO } from '../../fixtures/test-data';
```

### 3. 証跡を取得する

各テストの重要なステップで証跡を取得する。

```typescript
import { takeScreenshot } from '../helpers/evidence';

// アサーション前後でスクリーンショット
await takeScreenshot(page, 'checkout', 'before-confirm');
await page.getByRole('button', { name: 'Finish' }).click();
await takeScreenshot(page, 'checkout', 'after-confirm');
```

### 4. テスト構造のテンプレート

YAML 1ファイルから spec 1ファイルを生成する。テスト名には**シナリオID を必ず含める**（レポートから仕様へのトレーサビリティ確保）。

```typescript
import { test, expect } from '../../fixtures/base';
import { PRODUCTS } from '../../fixtures/test-data';
import { takeScreenshot } from '../../helpers/evidence';

test.describe('<feature> - <action>', () => {
  test('<シナリオID>: <シナリオ名>', async ({ loggedInPage: page }) => {
    // Arrange（前提条件の準備）

    // Act（操作の実行）

    // Assert（期待結果の検証）

    // Evidence（証跡取得）
    await takeScreenshot(page, '<scenario>', '<step>');
  });
});
```

**例:**
```typescript
test.describe('ログイン - ログイン成功', () => {
  test('LOGIN-001: 標準ユーザーでログインできる', async ({ page }) => { ... });
  test('LOGIN-002: パフォーマンス問題ユーザーでもログインできる', async ({ page }) => { ... });
});
```

**注意:** import パスの相対深度はテストファイルの配置に応じて調整する（`tests/login/` なら `../../fixtures/`）。

### 5. アサーションの書き方

YAML の `expect` を Playwright のアサーションに変換する。

| YAML の expect | Playwright アサーション |
|---|---|
| 「〜」と表示される | `await expect(page.getByText('〜')).toBeVisible()` |
| 〜ページに遷移する | `await expect(page).toHaveURL(/pattern/)` |
| 〜が N 件表示される | `await expect(page.locator('.item')).toHaveCount(N)` |
| 〜が無効化されている | `await expect(locator).toBeDisabled()` |

### 6. 待機処理

- 明示的な `waitForTimeout()` は使わない
- Playwright の auto-waiting を信頼する
- ネットワーク待機が必要な場合は `waitForResponse()` を使う
- ページ遷移待ちは `page.waitForURL(pattern)` を使う
- アニメーション完了待ちは `locator.waitFor({ state: 'stable' })` を検討する

### 7. DB 確認（`DB:` プレフィックス）の扱い

YAML の expect に `DB:` プレフィックスがある場合：

- **本プロジェクトでは対応しない**（SauceDemo は外部サイトのため DB アクセス不可）
- `DB:` 付きの expect は**テストコードにコメントとして残し、スキップする**

```typescript
// DB確認: orders テーブルに該当レコードが1件追加される
// → 本プロジェクトでは DB アクセス不可のためスキップ
```

自社システムに適用する場合は `helpers/db.ts` に DB ヘルパーを実装し、アサーションに変換する。

## 生成後のチェックリスト

- [ ] セマンティックロケータを使っているか
- [ ] ハードコードされた値が fixtures に定義されているか
- [ ] 証跡取得が含まれているか
- [ ] `waitForTimeout()` を使っていないか
- [ ] テスト同士が独立しているか（順序依存がないか）
