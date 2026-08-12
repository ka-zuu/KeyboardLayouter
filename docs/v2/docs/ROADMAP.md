# ロードマップ

各マイルストーンには**完了条件**を付けます。「だいたい動く」で次へ進まないための基準です。

```
M0 足場 → M1 core → M2 UI と編集 (機能等価) → M3 KLE 入出力
                                                   ↓
                          M6 その他 ← M5 KiCad ← M4 QMK
```

M1 と M2 は並行できません (M2 は M1 の型と関数に依存します)。
M3〜M5 は M2 完了後なら並行可能です。

## M0: リポジトリの足場

| 作業 |
|---|
| Vite + React 19 + TypeScript (strict) の雛形 |
| ESLint / Prettier |
| Vitest / Playwright の導入 |
| CI (lint → typecheck → test → e2e → build) |
| GitHub Pages へのデプロイ |
| `docs/` の配置と README |

手順は [BOOTSTRAP.md](BOOTSTRAP.md)。

**完了条件**

- `main` への push で CI が緑になり、GitHub Pages に「Hello」レベルの画面が出る
- `npm ci && npm run lint && npm run typecheck && npm test && npm run build` が
  クリーンな環境で通る

## M1: core (ドメインロジック)

| 作業 | 参照 |
|---|---|
| `core/model/types.ts` の型定義 | [DATA_MODEL.md](DATA_MODEL.md) |
| `core/model/migrate.ts` (v0 → v1) | [MIGRATION_FROM_MKD.md](MIGRATION_FROM_MKD.md) |
| `core/model/validate.ts` | [formats/PROJECT_JSON.md](formats/PROJECT_JSON.md#検証) |
| `core/geometry/` (単位換算・回転矩形・SAT・スナップ) | [GEOMETRY.md](GEOMETRY.md) |
| `core/matrix/` (自動割り当て・検証) | [MATRIX.md](MATRIX.md) |
| `core/commands/` (追加・移動・複製・削除・回転・整列・分布) | [ARCHITECTURE.md](ARCHITECTURE.md) |
| `io/project/` (プロジェクト JSON) | [formats/PROJECT_JSON.md](formats/PROJECT_JSON.md) |

**完了条件**

- [TESTING.md](TESTING.md#ユニットテストで必ず押さえる点) の `core` に関する項目すべてに
  テストがあり、通る
- 旧 MKD 形式のフィクスチャ 8 件すべてが変換でき、結果がスナップショットと一致する
- `core` と `io/project` に `window` / `document` / `indexedDB` への参照が無い
  (lint ルールで機械的に検査する)

## M2: UI とキャンバス編集 (機能等価)

ここが一番大きく、一番時間がかかります。

| 作業 | 参照 |
|---|---|
| デザイントークンとテーマ (ライト / ダーク) | [UI_SPEC.md](UI_SPEC.md#デザイントークン) |
| SVG レンダラ (キー描画・グリッド・選択表示) | [ARCHITECTURE.md](ARCHITECTURE.md#描画-キャンバス) |
| ビューポート操作 (パン・ズーム・ピンチ) | [GEOMETRY.md](GEOMETRY.md#ズームとパン) |
| ツール (Select / Add / Rotate / Pan) | [UI_SPEC.md](UI_SPEC.md#ツール) |
| 選択 (クリック・矩形・追加選択) | [GEOMETRY.md](GEOMETRY.md#選択判定) |
| ドラッグ移動・回転ハンドル・オービット回転 | [UI_SPEC.md](UI_SPEC.md#キャンバス) |
| インスペクタ (無選択 / 単一 / 複数) | [UI_SPEC.md](UI_SPEC.md#インスペクタ) |
| 左パネル (プリセット・プロジェクト一覧) | [UI_SPEC.md](UI_SPEC.md#左パネル) |
| ツールバー・ステータスバー | [UI_SPEC.md](UI_SPEC.md#ツールバー) |
| 履歴 (Undo / Redo) | [ARCHITECTURE.md](ARCHITECTURE.md#状態管理と履歴) |
| 永続化 (IndexedDB・自動保存・旧データ取り込み) | [MIGRATION_FROM_MKD.md](MIGRATION_FROM_MKD.md) |
| ショートカットとコマンドパレット | [UI_SPEC.md](UI_SPEC.md#キーボードショートカット) |

**完了条件**

- [FEATURE_PARITY.md](FEATURE_PARITY.md) の「等価」「改善」の行すべてが動作する
- E2E テストのシナリオ ([TESTING.md](TESTING.md#e2e-テスト)) がすべて通る
- 1000 キーのレイアウトで [TESTING.md](TESTING.md#性能テスト) の目標を満たす
- キーボードのみで、キーの追加から刻印編集・マトリクス割り当てまで完了できる

## M3: KLE 入出力

**このマイルストーンが「KLE の代替になる」ことの本体**です。

| 作業 | 参照 |
|---|---|
| JSON5 相当のパース (外側の `[` `]` 補完を含む) | [formats/KLE.md](formats/KLE.md#記法についての注意) |
| 逐次状態機械による parse | [formats/KLE.md](formats/KLE.md#逐次状態機械) |
| 刻印の並び替え (`labelMap`) | [formats/KLE.md](formats/KLE.md#刻印の並び替え) |
| 副矩形からの形状判定 | [formats/KLE.md](formats/KLE.md#形状の判定) |
| serialize (状態変更を最小化) | [formats/KLE.md](formats/KLE.md#出力) |
| 取込 UI での形式自動判別 | [formats/README.md](formats/README.md#入力の判別) |

**完了条件**

- フィクスチャ 8 件すべてで parse 結果がスナップショットと一致する
- 8 件すべてでラウンドトリップ (④ のべき等性まで) が通る
- KLE で作った実物のレイアウト (60% / TKL / 分割 / ISO) を取り込み、
  書き出したものを KLE に戻して見た目が一致する (手作業確認)

## M4: QMK

| 作業 | 参照 |
|---|---|
| `info.json` 出力 | [formats/QMK.md](formats/QMK.md#infojson) |
| `keymap.json` / `keymap.c` 雛形 | [formats/QMK.md](formats/QMK.md#keymapjson-雛形) |
| キーボード一式 zip | [formats/QMK.md](formats/QMK.md#出力単位) |
| インスペクタのキーボード情報・USB 設定 | [UI_SPEC.md](UI_SPEC.md#無選択--プロジェクト設定) |

**完了条件**

- フィクスチャ 5 件でゴールデンファイルと一致する
- 出力した `info.json` を QMK Configurator が受け付け、レイアウトが正しく表示される
  (手作業確認)
- 回転を含むレイアウトで `r` / `rx` / `ry` が正しい

## M5: KiCad

| 作業 | 参照 |
|---|---|
| S 式ノード → 文字列の直列化 | [formats/KICAD.md](formats/KICAD.md#s-式の生成) |
| 回路図 (旧アプリ同等: バス・ラベル・シンボル・配線・ジャンクション) | [formats/KICAD.md](formats/KICAD.md#回路図-kicad_sch) |
| **基板の完成** (ネット・ダイオード配置・パッドへのネット割当・中心配置への修正) | [formats/KICAD.md](formats/KICAD.md#基板-kicad_pcb) |
| フットプリント選択表 | [formats/KICAD.md](formats/KICAD.md#フットプリントの選択) |
| zip 出力と同梱 README | [formats/KICAD.md](formats/KICAD.md) |
| 分割キーボードの左右分割出力 | [formats/KICAD.md](formats/KICAD.md#分割キーボード) |

**完了条件**

- フィクスチャ 4 件でゴールデンファイルと一致する (UUID 固定)
- 回路図と基板のネット・Reference・UUID の整合テストが通る
- **KiCad で開いてエラーが出ず、「回路図から基板を更新」が警告なしで通る** (手作業確認)
- マトリクス未割り当てのプロジェクトで出力が中止され、理由が表示される

## M6: その他の形式と仕上げ

| 作業 | 参照 |
|---|---|
| VIA / Vial 定義の出力 | [formats/VIA_VIAL.md](formats/VIA_VIAL.md) |
| Ergogen YAML の出力 | [formats/ERGOGEN.md](formats/ERGOGEN.md) |
| URL 共有 (レイアウトを圧縮して URL に載せる) | – |
| PWA / オフライン対応 | – |
| ショートカット一覧ダイアログ・オンボーディング | [UI_SPEC.md](UI_SPEC.md) |

**完了条件**

- VIA / Ergogen のフィクスチャが一致する
- VIA の Design タブで定義が読める (手作業確認)

## 対象外 (将来検討する場合は ADR から)

| 項目 | 理由 |
|---|---|
| キーコード割り当て・レイヤ編集 | [formats/QMK.md](formats/QMK.md#スコープ) |
| 3D プレビュー | レイアウト設計に必要な情報が増えない |
| クラウド保存・アカウント | サーバーを持たない方針 |
| Ergogen の入力 (YAML → モデル) | [formats/ERGOGEN.md](formats/ERGOGEN.md#位置付け) |
| プレート (スイッチプレート) の DXF / SVG 出力 | 需要はあるが M6 以降。外形生成の仕様検討が別途必要 |
