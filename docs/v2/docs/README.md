# ドキュメント索引

本アプリ (仮称 KeyboardLayouter v2) の設計ドキュメント一式です。
**実装前に書かれた仕様**であり、実装と食い違いが出た場合はドキュメント側を
同じ Pull Request で直します ([../CONTRIBUTING.md](../CONTRIBUTING.md) 参照)。

## 読む順番

新しく参加する場合は上から順に読んでください。

| # | ドキュメント | 内容 |
|---|---|---|
| 1 | [ROADMAP.md](ROADMAP.md) | どのマイルストーンで何を作るか |
| 2 | [GLOSSARY.md](GLOSSARY.md) | 用語 (U, マトリクス, デカール, プレート等) |
| 3 | [ARCHITECTURE.md](ARCHITECTURE.md) | レイヤ構成・ディレクトリ・描画・状態管理 |
| 4 | [DATA_MODEL.md](DATA_MODEL.md) | 中心となるデータ構造 |
| 5 | [GEOMETRY.md](GEOMETRY.md) | 単位・座標系・回転・スナップ・当たり判定 |
| 6 | [MATRIX.md](MATRIX.md) | 電気マトリクスの考え方と自動割り当て |
| 7 | [UI_SPEC.md](UI_SPEC.md) | 画面構成・操作・ショートカット・デザイントークン |
| 8 | [formats/README.md](formats/README.md) | 入出力フォーマットの全体像 |
| 9 | [FEATURE_PARITY.md](FEATURE_PARITY.md) | 旧アプリとの機能等価チェックリスト |
| 10 | [TESTING.md](TESTING.md) | テスト戦略 |

## リファレンス

- [BOOTSTRAP.md](BOOTSTRAP.md) — リポジトリの初期構築手順
- [MIGRATION_FROM_MKD.md](MIGRATION_FROM_MKD.md) — 旧アプリ (MKD) のデータ移行
- フォーマット仕様
  - [formats/PROJECT_JSON.md](formats/PROJECT_JSON.md)
  - [formats/KLE.md](formats/KLE.md)
  - [formats/QMK.md](formats/QMK.md)
  - [formats/KICAD.md](formats/KICAD.md)
  - [formats/VIA_VIAL.md](formats/VIA_VIAL.md)
  - [formats/ERGOGEN.md](formats/ERGOGEN.md)
- [adr/README.md](adr/README.md) — 設計判断の記録 (ADR)

## 名称の差し替え

正式名称が決まったら、以下の箇所だけを書き換えれば足ります。
他のドキュメントでは意図的に製品名を使わず「本アプリ」と表記しています。

| 箇所 | 内容 |
|---|---|
| [../README.md](../README.md) | 見出しの製品名と冒頭の注意書き |
| このファイルの冒頭 | 「仮称 KeyboardLayouter v2」の記述 |
| `package.json` の `name` | パッケージ名 |
| `vite.config.ts` の `base` | GitHub Pages のサブパス (リポジトリ名) |
| `index.html` の `<title>` | ブラウザタブのタイトル |
| [MIGRATION_FROM_MKD.md](MIGRATION_FROM_MKD.md) | 旧名 `MKD` との対比表記 |
