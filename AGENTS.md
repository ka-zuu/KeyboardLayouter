# AGENTS.md

このリポジトリで作業する AI エージェント (Claude Code 等) 向けの指示です。
人間の開発者向けの手順は [CONTRIBUTING.md](CONTRIBUTING.md) にあります。両方に従ってください。

## このリポジトリの性質

自作キーボードの物理レイアウトエディタ (ブラウザ SPA)。サーバーは無く、
データはブラウザ内に保存されます。**出力ファイルが他ツール (QMK, KiCad, VIA) に
そのまま食わせられること**が価値の中心なので、フォーマット出力の正しさを最優先で守ります。

## 必ず守ること

1. **`src/core/` と `src/io/` にブラウザ API を書かない。**
   `window` / `document` / `indexedDB` / `localStorage` / DOM への参照は
   `src/ui/` または `src/platform/` に閉じ込めます。
2. **フォーマット出力を変えるときはゴールデンファイルを更新する。**
   `tests/fixtures/` 以下の期待値ファイルを、差分の理由を PR に書いた上で更新します。
   理由を説明できない差分が出たら、それはバグです。期待値を差分に合わせて
   黙って書き換えないでください。
3. **仕様を変えたら `docs/` の該当ファイルを同じ変更に含める。**
   対応表は [CONTRIBUTING.md](CONTRIBUTING.md#ドキュメントとコードの整合) にあります。
4. **未実装を実装済みと書かない。** ドキュメント・README・コミットメッセージで
   「対応済み」と書けるのはテストが通っているものだけです。
5. **依存を勝手に増やさない。** 新しい npm パッケージを入れる場合は、
   なぜ自前実装より良いかを PR に書きます。特にキャンバス描画ライブラリと
   状態管理ライブラリの追加は [docs/adr/](docs/adr/) の決定に反するので、
   ADR を追加して覆すところから始めてください。

## 作業の流れ

```bash
npm ci
npm run lint && npm run typecheck && npm test    # 変更前に緑であることを確認
# 変更する
npm run lint && npm run typecheck && npm test
npm run test:e2e                                  # UI を変更した場合
```

失敗したテストがある状態で「完了」と報告しないでください。

## タスク別の入口

| やること | 最初に読むファイル |
|---|---|
| データ構造を変える | [docs/DATA_MODEL.md](docs/DATA_MODEL.md), [docs/formats/PROJECT_JSON.md](docs/formats/PROJECT_JSON.md) |
| 座標・回転・当たり判定 | [docs/GEOMETRY.md](docs/GEOMETRY.md) |
| マトリクス自動割り当て | [docs/MATRIX.md](docs/MATRIX.md) |
| 新しい入出力形式 | [docs/formats/README.md](docs/formats/README.md) |
| KLE 互換の不具合 | [docs/formats/KLE.md](docs/formats/KLE.md) |
| QMK / KiCad 出力 | [docs/formats/QMK.md](docs/formats/QMK.md), [docs/formats/KICAD.md](docs/formats/KICAD.md) |
| 画面・操作・ショートカット | [docs/UI_SPEC.md](docs/UI_SPEC.md) |
| 旧アプリとの機能差 | [docs/FEATURE_PARITY.md](docs/FEATURE_PARITY.md) |

## 単位の扱い

座標系のバグが最も多いので、変数名に単位を含めてください
(`xU` = キー単位、`xMm` = ミリメートル、`xPx` = 画面ピクセル)。
換算は [docs/GEOMETRY.md](docs/GEOMETRY.md) の関数を通し、その場で `* 19.05` のような
マジックナンバーを書かないこと。

## 変更を避ける場所

- `tests/fixtures/` の入力ファイル (`input.*`) — 期待値ではなく**テスト条件**です。
  新しいケースが必要なら追加してください。既存のものを書き換えないこと。
- `docs/adr/` の既存 ADR — 決定は履歴として残します。覆す場合は新しい番号の
  ADR を追加し、古い方に `Superseded by` を追記します。
