---
applyTo: "**"
---

# Pull Request Review Guidelines

## 目的

このファイルは GitHub Copilot による Pull Request レビュー専用の共通指示です。レビューコメントは必ず日本語で書いてください。

## 優先順位

- まず `must` と `ask` を優先して指摘する。
- 重要な指摘は原則 3 件まで、最大でも 5 件までに絞る。
- `nits` は重要指摘とは別枠とし、必要な場合のみ最後にまとめる。
- 1 コメントでは 1 つの論点だけを扱い、問題点・影響・期待する対応を短く具体的に書く。

## レビュー観点

- 変更差分だけでなく、必要に応じて `docs/**`、`specs/**`、`src/**`、`tests/**` の整合性を確認する。
- ドキュメントと実装に不整合がある場合は、該当ファイルパス・識別子・設定値・テスト名など、リポジトリ内の具体的な根拠を引用して指摘する。
- 仕様不明・意図不明で断定できない場合は、決めつけず `ask` で確認を促す。
- 外部の公式ドキュメントや社内ルールを参照しないと判断できない場合、根拠を捏造せず `ask` で URL やルール提示を依頼する。

## コメントのメタ情報

各レビューコメントの冒頭には、次のいずれか 1 つを明示する。

- `[must]` 修正必須。この問題が残ると Approve できない。
- `[ask]` 回答必須。実装意図や根拠の確認が必要。
- `[imo]` 修正任意。別案や表現の提案。
- `[nits]` 修正任意。軽微な指摘。
- `[next]` 今回の修正は不要だが、今後の改善案。
- `[memo]` コード理解の補足メモ。
- `[good]` 良い点のフィードバック。

可能な限り、各コメントの先頭には対応する画像バッジ Markdown を明示的に出力する。画像バッジの直後に、同じ種別のテキストタグも必ず併記する。

- `must`: `![must-badge](https://img.shields.io/badge/review-must-red.svg) [must]`
- `ask`: `![ask-badge](https://img.shields.io/badge/review-ask-yellowgreen.svg) [ask]`
- `imo`: `![imo-badge](https://img.shields.io/badge/review-imo-orange.svg) [imo]`
- `nits`: `![nits-badge](https://img.shields.io/badge/review-nits-green.svg) [nits]`
- `next`: `![next-badge](https://img.shields.io/badge/review-next-blueviolet.svg) [next]`
- `memo`: `![memo-badge](https://img.shields.io/badge/review-memo-lightgrey.svg) [memo]`
- `good`: `![good-badge](https://img.shields.io/badge/review-good-brightgreen.svg) [good]`

各コメントは、原則として次の形式で始める。

`![must-badge](https://img.shields.io/badge/review-must-red.svg) [must] 問題点の要約`

画像バッジを使える場合は省略しない。Markdown 画像が表示されない環境でも意味が残るよう、テキストタグは必ず残す。

## 出し分けのルール

- `must` は明確な不具合、仕様逸脱、重大な保守性低下、セキュリティ問題、テスト不足に限定する。
- `ask` は、意図が不明な実装・根拠不足の仕様変更・外部根拠が必要な判断に使う。
- `imo` と `next` は、必須ではない改善提案に使う。
- `good` は本当に価値のある設計・実装・テストの工夫があるときだけ使う。
- `nits` を大量に並べて重要指摘を埋もれさせない。

## このリポジトリで特に確認すること

- `specs/` を変更したのに対応する `tests/e2e/` が更新されていない差分。
- `test()` タイトルのシナリオ ID と YAML のシナリオ ID の不一致。
- `status: done` のシナリオに対するテスト欠落。
- E2E テストでの DOM セレクタ使用や `waitForTimeout()` 使用。
- composables や views の変更に対するユニットテスト不足。
- バグ修正なのにリグレッションテストがない変更。
- localStorage への機密情報保存や、クライアントコードへのトークン埋め込み。
