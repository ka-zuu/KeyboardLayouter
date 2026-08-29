# アーキテクチャ

## 全体像

サーバーを持たない静的 SPA です。ビルド成果物は `dist/` の静的ファイルのみで、
Vercel に配置します (v1 と同じオリジンを継続。理由は [adr/0001-tech-stack.md](adr/0001-tech-stack.md))。
実行時の通信は行いません (フォント・アイコンも自前バンドル)。

```
ユーザー操作
   ↓
src/ui/          React コンポーネント・入力ハンドリング・描画
   ↓ (コマンド呼び出し)
src/state/       ストア (Zustand) + 履歴 (Undo/Redo)
   ↓ (純関数呼び出し)
src/core/        ドメインロジック (model / geometry / matrix)  ← ブラウザ API 禁止
   ↕
src/io/          フォーマット変換 (KLE / QMK / KiCad / VIA / Ergogen / プロジェクト JSON)
   ↕
src/platform/    IndexedDB・ファイル入出力・zip 生成など環境依存の処理
```

依存の向きは **`ui` → `state` → `core`**、および **`io` → `core`** の一方向のみです。
`core` は他のどのレイヤも参照しません。

## なぜこの分割にするか

旧アプリでは 1 つの Zustand ストア (`store/useStore.ts`, 約 500 行) の中に、
状態遷移・正規化・旧データのマイグレーション・マトリクス割り当てのソート処理までが
同居していました。結果として、

- マトリクス割り当てのようなアルゴリズムを単体でテストできない
- 保存形式のマイグレーションが「プロジェクトを読み込む」操作の副作用として実行される
- 選択状態 (`isSelected`) が永続データに混入する

といった問題が出ていました。本アプリでは、**アルゴリズムとフォーマット変換を
UI から切り離した純関数**として置き、ストアはそれを呼ぶだけの薄い層にします。
詳細は [adr/0005-core-ui-separation.md](adr/0005-core-ui-separation.md)。

## ディレクトリ構成

```
src/
├── core/
│   ├── model/          データ型と不変な操作 (DATA_MODEL.md と 1:1)
│   │   ├── types.ts
│   │   ├── deps.ts         ID 生成・現在時刻の注入点 (ModelDeps)
│   │   ├── key.ts          キー生成・複製・更新のヘルパ
│   │   ├── project.ts      プロジェクト生成・正規化・出力順ソート
│   │   ├── migrate.ts      schemaVersion に基づく前方移行
│   │   └── validate.ts     構造検証 (validateProject) と自動修復 (repairProject)
│   ├── geometry/       座標・回転・当たり判定 (GEOMETRY.md と 1:1)
│   │   ├── units.ts        U ⇄ mm ⇄ px 換算
│   │   ├── rect.ts         回転矩形の頂点 / AABB / 回転中心
│   │   ├── sat.ts          分離軸判定
│   │   ├── snap.ts         グリッドスナップ
│   │   ├── shape.ts        キー形状の輪郭 (主矩形+副矩形の幾何和) と AABB
│   │   └── select.ts       矩形選択の 3 段判定 (AABB→包含円→SAT)
│   ├── matrix/         Row/Col 自動割り当て (MATRIX.md と 1:1)
│   └── commands/       編集操作を 1 単位として表す関数群 (履歴に載る単位)
├── io/
│   ├── types.ts        FormatWarning / ParseResult / SerializeResult
│   ├── project/        独自 JSON
│   ├── kle/            KLE raw JSON (parse / serialize)
│   ├── qmk/            info.json / keymap 雛形
│   ├── kicad/          .kicad_sch / .kicad_pcb / .kicad_pro (S 式生成)
│   ├── via/            VIA / Vial 定義
│   └── ergogen/        Ergogen YAML
├── state/
│   ├── store.ts        Zustand ストア (プロジェクト + 編集状態)
│   ├── history.ts      Undo/Redo
│   └── selectors.ts    派生値 (選択キー、バウンディングボックス等)
├── platform/
│   ├── storage/        IndexedDB アダプタ + localStorage フォールバック
│   ├── download.ts     Blob のダウンロード
│   └── zip.ts          zip 生成
├── ui/
│   ├── App.tsx
│   ├── canvas/         レンダラ (SVG 実装 / 描画インタフェース)
│   ├── panels/         左パネル・右インスペクタ・ステータスバー
│   ├── toolbar/        上部ツールバー・エクスポートメニュー
│   ├── command/        コマンドパレットとコマンド定義
│   ├── hooks/          ポインタ操作・キーボードショートカット
│   └── theme/          デザイントークン
└── main.tsx
tests/
├── unit/               core と io のテスト
├── fixtures/           入力とゴールデンファイル
└── e2e/                Playwright
```

## 描画 (キャンバス)

**SVG を既定の描画方式**とします。1 キーを 1 つの `<g>` にし、回転は
`transform="rotate(angle cx cy)"` で表現します。これは:

- キーの形状 (ISO Enter やステップド) を `<path>` でそのまま書ける
- ヒットテストをブラウザに任せられる部分が多い
- E2E テストから要素を選択でき、視覚的な検証がしやすい

ためです。キー数が多い場合の性能が問題になったときのために、描画層は
インタフェース越しに差し替えられるようにします。

```ts
export interface LayoutRenderer {
  mount(container: HTMLElement): void;
  render(scene: RenderScene): void;
  hitTest(pointPx: { x: number; y: number }): string | null; // キー id
  dispose(): void;
}
```

`RenderScene` は「表示に必要な情報だけを持つ平坦な構造」であり、
ストアの型ではなく描画用に射影した型にします。これにより Canvas 実装を
追加するときに `ui/panels` 以下を触らずに済みます。
判断の経緯は [adr/0002-rendering.md](adr/0002-rendering.md)。

### ビューポート

- ワールド座標は U (キー単位)。画面座標への変換は `scale` と `pan` の 2 つだけで表現する。
- `scale` の範囲は 0.2〜4.0 (旧アプリは 0.5〜3.0。KLE から大きなレイアウトを
  読み込んだときに全体を見渡せるよう下限を広げる)。
- パン操作は Space + ドラッグ / 中ボタンドラッグ / 2 本指ドラッグ。
- 座標変換は `core/geometry/units.ts` の関数のみを使う。コンポーネント内で
  `* PIXELS_PER_U` を直接書かない。

## 状態管理と履歴

ストアは 2 つに分けます。

| ストア | 中身 | 永続化 | 履歴 |
|---|---|---|---|
| プロジェクトストア | `ProjectModel` (キー配列とキーボードのメタ情報) | する | する |
| 編集ストア | 選択、ズーム、パン、グリッド、スナップ、アクティブツール、クリップボード | 一部のみ | しない |

- **選択状態はプロジェクトに入れない。** 旧アプリの `KeyData.isSelected` は
  永続データに UI 状態が混入していたため、本アプリでは編集ストア側の
  `selectedKeyIds: string[]` のみで表します。
- Undo/Redo は「プロジェクトストアのスナップショット」を積みます (上限 50)。
  ドラッグ中の連続更新は履歴に積まず、ドラッグ終了時に 1 エントリだけ積みます。
  方式の比較は [adr/0003-state-and-history.md](adr/0003-state-and-history.md)。
- 編集操作は `core/commands/` の純関数として書き、ストアはそれを適用するだけにします。

```ts
// 例: core/commands/moveKeys.ts
export function moveKeys(
  project: ProjectModel,
  ids: readonly string[],
  deltaU: { x: number; y: number },
): ProjectModel;
```

## 永続化

- 主ストレージは IndexedDB (`platform/storage`)。`localStorage` は容量上限
  (概ね 5MB) に当たるためフォールバックとしてのみ使います。
- 書き込みは 1000ms のデバウンス。ドラッグ中に毎フレーム書かないこと。
- 起動時に旧アプリのデータがあれば読み込んで移行します
  ([MIGRATION_FROM_MKD.md](MIGRATION_FROM_MKD.md))。
- 詳細は [adr/0004-storage.md](adr/0004-storage.md)。

## 旧アプリから引き継ぐ実装

以下は旧アプリで動作実績があり、設計上の理由も含めて移植する価値があります。
新規に書き直すのではなく、参照して移すこと。

| 旧アプリの箇所 | 内容 | 移植先 |
|---|---|---|
| `lib/geometry.ts` の `doPolygonsIntersect` | 分離軸判定 (SAT) による多角形交差判定 | `core/geometry/sat.ts` |
| 同 `getRotatedRectPoints` / `getRotatedRectAABB` | 回転矩形の頂点と AABB。sin/cos を事前計算して渡せる形になっている | `core/geometry/rect.ts` |
| 同 `rotatePointPrecalc` | 事前計算した sin/cos で点を回転 | `core/geometry/rect.ts` |
| `store/useStore.ts` の `autoAssignMatrix` | Y 座標を 0.1U バケットに量子化してソートする方式。**比較関数の推移律を保つための設計**なので、量子化を外さないこと | `core/matrix/autoAssign.ts` |
| `lib/qmk.ts` の `rx`/`ry` 算出 | QMK の回転原点は絶対座標 | `io/qmk/` |
| `lib/kicad.ts` の S 式生成 | `lib_symbols` にシンボル定義を埋め込み、外部ライブラリ依存を避ける方針 | `io/kicad/` |
| `lib/storage.ts` / `lib/idb.ts` | IndexedDB アダプタ、デバウンス書き込み、localStorage からの移行 | `platform/storage/` |

## 性能の考え方

- 1000 キーのレイアウトで、選択・移動・描画が体感で引っかからないことを目標にします
  (旧アプリのベンチマークと同じ基準)。
- 高頻度更新 (ドラッグ) の間は、React の再レンダリングを選択中のキーに限定します。
  ストアの購読は必要なフィールド単位で行い、プロジェクト全体を購読しないこと。
- 当たり判定は 3 段構え (AABB → 包含円 → SAT) で、重い判定に入る前に落とします
  ([GEOMETRY.md](GEOMETRY.md#選択判定))。
