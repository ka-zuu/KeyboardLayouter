# 機能等価チェックリスト

作り直しの受け入れ基準です。「機能は同じ」の定義をここで固定します。
旧アプリ (MKD: Next.js + React + Konva 版) の全機能を列挙し、新版での扱いを示します。

**扱い** の意味:

| 記号 | 意味 |
|---|---|
| 等価 | 旧アプリと同じことができる (実装方法は変わってよい) |
| 改善 | 同じことができ、かつ不足を補う |
| 新規 | 旧アプリに無かった機能 |
| 完成 | 旧アプリでは未実装・半実装だったものを動く状態にする |
| 廃止 | 意図的に作らない |

## キャンバス操作

| 機能 | 旧アプリの実装箇所 | 扱い | 備考 |
|---|---|---|---|
| 無限キャンバス | `components/editor/CanvasArea/MainCanvas.tsx` | 等価 | Konva → SVG レンダラ |
| ホイールズーム (カーソル固定) | 同 `handleWheel` | 等価 | 範囲を 0.5〜3.0 → 0.2〜4.0 に拡大 (改善) |
| Space + ドラッグでパン | 同 `isSpacePressed` | 等価 | |
| 中ボタンドラッグでパン | 同 `isMiddleMousePressed` | 等価 | |
| ピンチによるパン・ズーム | 同 `touchstart` / `touchmove` の 2 本指処理 | 等価 | Pointer Events で再実装 |
| グリッド表示 | `components/editor/CanvasArea/GridBackground.tsx` | 改善 | 5U ごとの太線、原点マーカーを追加 |
| グリッドスナップ (1 / 0.5 / 0.25 / 0.125 / 0.05U) | `store/useStore.ts` の `gridSize`、`components/editor/TopBar.tsx` | 等価 | |
| スナップの有効・無効 | `store/useStore.ts` の `toggleSnap` | 改善 | 旧アプリはストアに関数があるだけで UI が無かった。ツールバーにトグルを置く |
| キーのドラッグ移動 | `components/editor/CanvasArea/KeyObject.tsx` | 等価 | |
| 矩形選択 | `MainCanvas.tsx` の選択範囲処理 | 改善 | 交差選択 / 包含選択 (Alt) を切替可に |
| Shift クリックで追加選択 | `store/useStore.ts` の `selectKey(id, multi)` | 等価 | |
| 回転ハンドル | `KeyObject.tsx` | 等価 | |
| 複数選択の一括回転 (オービット) | `KeyObject.tsx` | 等価 | |
| キーの重なり自動回避 | `components/editor/LeftSidebar.tsx` の `handlePresetClick` | 等価 | グリッド幅単位で右へ、最大 100 回試行 |
| マトリクス番号の重ね表示 | `KeyObject.tsx` の Matrix Row/Col 表示 | 改善 | 常時表示 → トグル可能に |
| 明示的なツール切り替え | (なし) | 新規 | Select / Add / Rotate / Pan |
| キャンバス上での刻印直接編集 | (なし) | 新規 | ダブルクリック |

## キーの編集

| 機能 | 旧アプリの実装箇所 | 扱い | 備考 |
|---|---|---|---|
| プリセットからキー追加 (クリック) | `LeftSidebar.tsx` の `PRESETS` (9 種) | 改善 | プリセットを追加 (7U, 縦 2U, Big-Ass Enter, ステップド) |
| プリセットのドラッグ＆ドロップ追加 | `LeftSidebar.tsx` の `handleDragStart` / `MainCanvas.tsx` の `handleDrop` | 等価 | |
| 個数指定の一括追加 | `TopBar.tsx` の Count フィールド、`store/useStore.ts` の `addKeys` | 等価 | 配置先を左パネルへ移動 |
| 複製 | `store/useStore.ts` の `duplicateSelectedKeys` | 等価 | |
| 削除 | 同 `deleteSelectedKeys` | 等価 | |
| コピー / 貼り付け | 同 `copyKeys` / `pasteKeys` | 等価 | |
| 矢印キー移動 | `components/editor/KeyboardShortcuts.tsx` | 等価 | Shift で 1U |
| Tab / Shift+Tab でキー巡回 | `components/editor/RightSidebar.tsx` の `handleKeyDown` | 等価 | インスペクタ外でも効くように (改善) |
| 刻印の編集 | `RightSidebar.tsx` (top / bottom / left / right の 4 面) | 改善 | 12 スロットに拡張 |
| 座標 (X / Y) の数値編集 | `RightSidebar.tsx` | 等価 | |
| 寸法 (W / H) の数値編集 | `RightSidebar.tsx` | 等価 | |
| 回転角の数値編集 | `RightSidebar.tsx` | 等価 | |
| 回転中心の編集 | (なし。`rotationCenter` は `{0,0}` 固定でフィールドのみ存在) | 完成 | 幾何中心 / 座標指定を切替可に |
| マトリクス Row / Col の手動編集 | `RightSidebar.tsx` | 等価 | 未割り当てにする操作を追加 |
| 形状の選択 (矩形 / ISO Enter) | `RightSidebar.tsx` の Shape セレクタ | 等価 | |
| ステップド形状 | `types/mkd.ts` の `stepped_caps` (型のみ。矩形として描画される) | 完成 | 副矩形を持つ形状として描画・出力 |
| Big-Ass Enter | (なし) | 新規 | KLE 互換に必要 |
| 副矩形の編集 (x2 / y2 / w2 / h2) | (なし) | 新規 | KLE 互換に必要 |
| デカール / ホーミング / ゴースト | (なし) | 新規 | KLE 互換に必要 |
| キー色 / 刻印色 | (なし) | 新規 | KLE 互換に必要 |
| 整列・分布 | (なし) | 新規 | |
| 複数選択の一括プロパティ編集 | (なし) | 新規 | |

## マトリクス

| 機能 | 旧アプリの実装箇所 | 扱い | 備考 |
|---|---|---|---|
| 自動割り当て (全キー) | `store/useStore.ts` の `autoAssignMatrix` | 等価 | Y の 0.1U バケット量子化を含めて移植 |
| 自動割り当て (選択キーのみ) | 同 (`targetIds` 引数) | 等価 | |
| 開始 Row / Col の指定 | `RightSidebar.tsx` の `MatrixStartInput` | 等価 | |
| 回転キーを考慮した並べ替え | (なし。`position` のみで判定) | 改善 | 回転後の中心座標で並べる |
| マトリクス検証 (重複・未割り当て・欠番) | (なし) | 新規 | |
| 分割キーボードの左右 | (なし) | 新規 | |

## 履歴・永続化・プロジェクト管理

| 機能 | 旧アプリの実装箇所 | 扱い | 備考 |
|---|---|---|---|
| Undo / Redo (50 段) | `store/useStore.ts` の `temporal` (zundo) | 等価 | 自前の履歴層で実装 |
| Undo / Redo ボタン | `TopBar.tsx` | 改善 | 操作名をツールチップに表示 |
| キーボードショートカット (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y) | `KeyboardShortcuts.tsx` | 等価 | |
| IndexedDB への自動保存 (1000ms デバウンス) | `lib/storage.ts`, `lib/idb.ts` | 等価 | |
| localStorage へのフォールバック | `lib/storage.ts` | 等価 | |
| localStorage → IndexedDB の自動移行 | `lib/storage.ts` の `getItem` | 等価 | |
| 複数プロジェクトの保存 | `store/useStore.ts` の `savedProjects` / `saveProject` | 等価 | |
| プロジェクトの読み込み / 新規作成 / 削除 | 同 `loadProject` / `createProject` / `deleteProject` | 等価 | |
| プロジェクト名の編集 | `TopBar.tsx` | 等価 | |
| グリッド設定の永続化 | (なし。リロードで既定値に戻る) | 改善 | `editorPrefs` として保存 |
| 旧フォーマットのデータ移行 | `store/useStore.ts` の `loadProject` 内 (`visualLegend`, `tl/tr/bl/br`) | 改善 | 独立した `migrate()` 関数へ ([MIGRATION_FROM_MKD.md](MIGRATION_FROM_MKD.md)) |

## 入出力

| 機能 | 旧アプリの実装箇所 | 扱い | 備考 |
|---|---|---|---|
| プロジェクト JSON のエクスポート | `TopBar.tsx` の `handleExportJson` | 等価 | `schemaVersion` を追加 |
| プロジェクト JSON のインポート | `TopBar.tsx` の `handleImport` | 改善 | 検証とエラー内容の提示を追加 |
| QMK `info.json` の出力 | `lib/qmk.ts` の `generateQMKInfo` | 改善 | メタ情報を設定可能に、`matrix_size` を追加 |
| QMK keymap 雛形の出力 | (なし) | 新規 | `KC_NO` 埋め |
| KiCad 回路図 (`.kicad_sch`) | `lib/kicad.ts` の `generateSch` | 等価 | UUID を差し替え可能にしてテスト可能に (改善) |
| KiCad 基板 (`.kicad_pcb`) | `lib/kicad.ts` の `generatePcb` (スイッチ配置のみ。ネット・ダイオード・配線なし) | 完成 | ネット割り当てとダイオード配置を実装。キー中心への配置ずれも修正 |
| KiCad プロジェクト (`.kicad_pro`) | `lib/kicad.ts` の `generatePro` | 等価 | |
| KiCad zip の出力 | `lib/kicad.ts` の `generateKicadProjectZip` | 等価 | |
| KLE raw JSON の入力 | (なし) | 新規 | 本アプリの最重要要件 |
| KLE raw JSON の出力 | (なし) | 新規 | |
| VIA / Vial 定義の出力 | (なし) | 新規 | |
| Ergogen YAML の出力 | (なし) | 新規 | |

## UI 全般

| 機能 | 旧アプリの実装箇所 | 扱い | 備考 |
|---|---|---|---|
| 3 ペインレイアウト | `components/editor/EditorLayout.tsx` | 改善 | ステータスバーを追加、パネル折りたたみ可 |
| ダークテーマ | Tailwind クラスの直書き (`bg-gray-900` 等) | 改善 | トークン化し、ライト / ダーク / システム追従 |
| エクスポートのドロップダウン | `TopBar.tsx` | 等価 | 項目を追加 |
| コマンドパレット | (なし) | 新規 | |
| ショートカット一覧の表示 | (なし) | 新規 | `?` |
| エラー表示 | `alert()` (`TopBar.tsx` の `handleImport` / `handleExportKicad`) | 改善 | 画面内トーストで、原因を具体的に示す |
| アクセシビリティ対応 | (考慮なし) | 新規 | [UI_SPEC.md](UI_SPEC.md#アクセシビリティ) |

## 廃止するもの

| 旧アプリの要素 | 廃止理由 |
|---|---|
| `components/DevStoreExporter.tsx` | E2E テスト用にストアを `window` へ露出させる仕組み。新版では `data-testid` と Playwright の評価で代替する |
| `KeyData.isSelected` | UI 状態が永続データに混入していた ([DATA_MODEL.md](DATA_MODEL.md)) |
| 座標の 0 クランプ (`Math.max(0, ...)`) | 負座標を含む KLE レイアウトを壊すため ([GEOMETRY.md](GEOMETRY.md#座標の範囲)) |
| Next.js の App Router | サーバー機能を使っていないため ([adr/0001-tech-stack.md](adr/0001-tech-stack.md)) |
| `lib/kicad.ts` の出力後の文字列置換 (`.replace(/<[^>]+>/g, "")` 等) | 生成側の不具合を後処理で隠す構造だったため ([formats/KICAD.md](formats/KICAD.md#s-式の生成)) |

## 受け入れ判定

M2 (UI とキャンバス編集) の完了条件は、**この表の「等価」「改善」の行すべてが
動作すること**です。判定は以下で行います。

1. 上記の各行に対応する E2E テストまたはユニットテストがある
2. [TESTING.md](TESTING.md#リリース前の手作業確認) の手作業チェックリストを一通り実施
3. 旧アプリで作ったプロジェクト JSON を読み込み、同じレイアウトが再現される
