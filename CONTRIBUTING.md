# 開発の進め方

## 前提

- Node.js 22 以上
- `npm ci` で依存を固定インストールする (`npm install` は lockfile を書き換えるので、
  依存を意図的に追加・更新するときだけ使う)

## ブランチとコミット

- `main` は常にビルドが通る状態を保つ。直接コミットしない。
- 作業ブランチは `feat/<内容>` `fix/<内容>` `docs/<内容>` のいずれか。
- コミットメッセージは Conventional Commits + 日本語本文。

  ```
  feat(io/kle): KLE raw JSON のインポートを追加

  - 逐次状態機械で x/y/r/rx/ry の継承を処理
  - legend の並び替え (labelMap) に対応
  ```

  型は `feat` / `fix` / `docs` / `refactor` / `test` / `perf` / `chore`。
  スコープは `core/geometry` `io/qmk` `ui/inspector` のようにディレクトリに合わせる。

## コミット前に通すもの

```bash
npm run lint
npm run typecheck
npm test
```

UI に手を入れた場合は `npm run test:e2e` も通す。CI でも同じものが走るので、
ローカルで落ちるものを push しない。

## コーディング規約

- TypeScript は `strict` 前提。`any` を使う場合は理由をコメントに書く。
- **`src/core/` と `src/io/` にブラウザ API を書かない。** `window` `document`
  `localStorage` `indexedDB` に触れるコードは `src/ui/` か `src/platform/` に置く。
  これは Node 上のユニットテストでロジックを全網羅するための制約
  ([docs/adr/0005-core-ui-separation.md](docs/adr/0005-core-ui-separation.md))。
- 座標計算・マトリクス割り当て・フォーマット変換は**純関数**として書き、
  React コンポーネントや store の中に埋め込まない。
- 数値の等値比較には許容誤差を使う。座標は浮動小数なので `===` で比較しない
  (許容誤差の既定値は [docs/GEOMETRY.md](docs/GEOMETRY.md) 参照)。
- 単位を型名・変数名に出す (`xU`, `xMm`, `xPx`)。単位の混同が一番多いバグ源。

## ドキュメントとコードの整合

仕様を変える変更では、**該当する `.md` を同じ Pull Request で更新する**。
特に以下は実装と 1 対 1 で対応させる。

| 変更した箇所 | 併せて直すドキュメント |
|---|---|
| `src/core/model/` の型 | [docs/DATA_MODEL.md](docs/DATA_MODEL.md) |
| `src/core/geometry/` | [docs/GEOMETRY.md](docs/GEOMETRY.md) |
| `src/core/matrix/` | [docs/MATRIX.md](docs/MATRIX.md) |
| `src/io/<形式>/` | `docs/formats/<形式>.md` |
| ショートカット・画面構成 | [docs/UI_SPEC.md](docs/UI_SPEC.md) |
| 保存形式の互換性 | [docs/formats/PROJECT_JSON.md](docs/formats/PROJECT_JSON.md) |

「実装済み」と書けるのはテストが通っているものだけ。未完成の機能は
ドキュメント上で**未実装であることを明記する** (旧アプリでは実装状況と
ドキュメントの乖離が繰り返し問題になった)。

## Pull Request

- 何を変えたかと、**なぜ**変えたかを書く。
- 出力フォーマットに影響する変更は、ゴールデンファイルの差分を PR 説明に貼る。
- レビュー観点は [docs/TESTING.md](docs/TESTING.md) の「レビュー時に確認すること」を参照。
