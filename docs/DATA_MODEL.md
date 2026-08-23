# データモデル

`src/core/model/types.ts` に置く定義です。このドキュメントと実装は 1 対 1 に保ちます。

## 設計方針

1. **永続データに UI 状態を入れない。** 選択状態・ズーム・パンはモデルの外。
2. **`schemaVersion` を必ず持つ。** 移行処理は読み込み時の副作用ではなく、
   `migrate(raw)` という独立した純関数にする。
3. **未設定を `null` で表す。** マトリクス未割り当てを `{row: 0, col: 0}` で
   表現すると「0 行 0 列に割り当て済み」と区別できないため。
4. **KLE の表現力を受け止められる形にする。** 12 スロットの刻印、副矩形
   (`x2/y2/w2/h2` 相当)、デカール、ホーミング、色。KLE 入出力は本アプリの
   最重要要件なので、モデル側で情報を落とさないようにする。

## 型定義

```ts
/** スキーマの版。破壊的変更のたびに +1 し、migrate() に移行処理を足す。 */
export const SCHEMA_VERSION = 1;

/** キー単位 (U) の座標。1U = 19.05mm。Y は下方向が正。 */
export interface PointU {
  x: number;
  y: number;
}

/** キー単位 (U) の寸法。 */
export interface SizeU {
  w: number;
  h: number;
}

/**
 * 刻印の位置。KLE の 12 スロットと同じ配置。
 * 上段 / 中段 / 下段の 3x3 と、キー前面 (front) の 3 スロット。
 */
export type LegendSlot =
  | 'topLeft'
  | 'topCenter'
  | 'topRight'
  | 'centerLeft'
  | 'center'
  | 'centerRight'
  | 'bottomLeft'
  | 'bottomCenter'
  | 'bottomRight'
  | 'frontLeft'
  | 'frontCenter'
  | 'frontRight';

/** 空文字のスロットは持たない (省略する)。 */
export type Legends = Partial<Record<LegendSlot, string>>;

/**
 * キーキャップの形状。
 * - rect:         単一の矩形
 * - isoEnter:     ISO Enter (副矩形が下側にずれる)
 * - steppedCaps:  ステップド (KLE の l:true)。段差部分を副矩形で表す
 * - bigAssEnter:  Big-Ass Enter (副矩形が左下)
 * - custom:       副矩形で表現しきれない形状。polygon を持つ
 */
export type KeyShape = 'rect' | 'isoEnter' | 'steppedCaps' | 'bigAssEnter' | 'custom';

/**
 * 副矩形。主矩形の左上を原点とした相対座標 (U)。
 * KLE の x2/y2/w2/h2 に対応する。shape が 'rect' のときは null。
 */
export interface SecondaryRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * 回転。
 * - angle:  度。時計回りが正。
 * - origin: 回転中心 (絶対座標 U)。null のときはキーの幾何中心を軸に回す。
 *           KLE から読み込んだキーは rx/ry を絶対座標として持つのでここに入る。
 */
export interface Rotation {
  angle: number;
  origin: PointU | null;
}

/** 電気マトリクス上の位置。未割り当ては null で表す。 */
export interface MatrixAddress {
  row: number;
  col: number;
}

/** 分割キーボードでの所属。単体キーボードでは 'single'。 */
export type SplitSide = 'single' | 'left' | 'right';

export interface KeyModel {
  /** UUID v4。プロジェクト内で一意。 */
  id: string;
  /** 主矩形の左上座標 (U)。負値も許す。 */
  position: PointU;
  /** 主矩形の寸法 (U)。 */
  size: SizeU;
  rotation: Rotation;
  shape: KeyShape;
  /** shape が 'rect' 以外のときの副矩形。'custom' では null で polygon を使う。 */
  secondary: SecondaryRect | null;
  /** shape が 'custom' のときの輪郭。主矩形の左上を原点とした U 座標。 */
  polygon: PointU[] | null;
  legends: Legends;
  /** 未割り当ては null。 */
  matrix: MatrixAddress | null;
  /** 装飾専用でスイッチを持たない (KLE の d:true)。出力から除外される。 */
  decal: boolean;
  /** ホーミング (KLE の n:true)。 */
  homing: boolean;
  /** ゴースト表示 (KLE の g:true)。 */
  ghost: boolean;
  /** キーキャップ色 (#rrggbb)。未指定は null でテーマ既定色。 */
  color: string | null;
  /** 刻印色 (#rrggbb)。未指定は null。 */
  legendColor: string | null;
  side: SplitSide;
}

export type DiodeDirection = 'COL2ROW' | 'ROW2COL';

export interface UsbInfo {
  /** '0xFEED' 形式の 16 進文字列。 */
  vid: string;
  pid: string;
  deviceVersion: string;
}

/**
 * キーボード単位のメタ情報。
 * 旧アプリでは QMK 出力時にハードコードされていた値をここで持つ。
 */
export interface KeyboardMeta {
  keyboardName: string;
  manufacturer: string;
  maintainer: string;
  url: string;
  usb: UsbInfo;
  diodeDirection: DiodeDirection;
  /** 分割キーボードかどうか。true のとき KeyModel.side を使う。 */
  split: boolean;
}

export interface ProjectModel {
  schemaVersion: number;
  /** UUID v4。 */
  id: string;
  /** ユーザーが付けるプロジェクト名。ファイル名の既定値にも使う。 */
  name: string;
  keys: KeyModel[];
  meta: KeyboardMeta;
  /** Unix ミリ秒。 */
  createdAt: number;
  updatedAt: number;
}
```

### 編集状態 (永続化されない / 履歴に載らない)

```ts
export type ActiveTool = 'select' | 'addKey' | 'rotate' | 'pan';

export interface EditorState {
  selectedKeyIds: string[];
  /** ズーム倍率 (0.2〜4.0)。 */
  scale: number;
  /** パン量 (画面ピクセル)。 */
  panPx: PointU;
  /** スナップ間隔 (U)。 */
  gridSize: number;
  snapEnabled: boolean;
  activeTool: ActiveTool;
  clipboard: KeyModel[];
}
```

`scale` / `panPx` / `gridSize` / `snapEnabled` / `activeTool` はリロードで
既定値に戻ります (旧アプリと同じ)。ただし `gridSize` と `snapEnabled` は
作業の連続性に関わるため、**プロジェクトとは別のキー**で
IndexedDB に保存し、次回起動時に復元します (旧アプリからの改善点)。

## 既定値

```ts
export function createKey(partial: Partial<KeyModel> = {}): KeyModel {
  return {
    id: crypto.randomUUID(),
    position: { x: 0, y: 0 },
    size: { w: 1, h: 1 },
    rotation: { angle: 0, origin: null },
    shape: 'rect',
    secondary: null,
    polygon: null,
    legends: {},
    matrix: null,
    decal: false,
    homing: false,
    ghost: false,
    color: null,
    legendColor: null,
    side: 'single',
    ...partial,
  };
}

export function createProject(name = 'Untitled'): ProjectModel {
  const now = Date.now();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: crypto.randomUUID(),
    name,
    keys: [],
    meta: {
      keyboardName: name,
      manufacturer: '',
      maintainer: '',
      url: '',
      usb: { vid: '0xFEED', pid: '0x0000', deviceVersion: '0.0.1' },
      diodeDirection: 'COL2ROW',
      split: false,
    },
    createdAt: now,
    updatedAt: now,
  };
}
```

## 旧モデル (MKD) との対応

旧アプリの `types/mkd.ts` からの変更点です。移行手順は
[MIGRATION_FROM_MKD.md](MIGRATION_FROM_MKD.md) にあります。

| 旧 | 新 | 変更理由 |
|---|---|---|
| (なし) | `ProjectModel.schemaVersion` | 移行処理を読み込みの副作用から分離するため |
| `KeyData.isSelected?: boolean` | 削除 (`EditorState.selectedKeyIds`) | UI 状態が永続データに混入していた |
| `legends: { top, bottom, left, right }` | `legends: Partial<Record<LegendSlot, string>>` | KLE の 12 スロットを表現するため |
| `angle` + `rotationCenter` (相対オフセット、常に `{0,0}`) | `rotation: { angle, origin }` (`origin` は絶対座標、`null` で幾何中心) | 旧構造では「幾何中心回転」と「原点回転」が両立せず、キャンバス描画と QMK 出力で解釈が食い違っていた |
| `matrix: { row, col }` (既定 `{0,0}`) | `matrix: MatrixAddress \| null` | 未割り当てを表現するため |
| `variant?: 'rect' \| 'iso_enter' \| 'stepped_caps'` | `shape` + `secondary` + `polygon` | 副矩形を持たないと ISO Enter / ステップドを正しく出力できない |
| (なし) | `decal` / `homing` / `ghost` / `color` / `legendColor` | KLE のプロパティを落とさないため |
| (なし) | `side` / `meta.split` | 分割キーボードの左右を区別するため |
| QMK 出力時のハードコード (`manufacturer: 'Unknown'`, `vid: '0xFEED'`) | `ProjectModel.meta` | 出力内容をユーザーが設定できるようにするため |

### 刻印スロットの対応

旧アプリの 4 面はキャンバス上で「上中央 / 下中央 / 左中段 / 右中段」に
描画されていました。新モデルへは次のように移します。

| 旧 | 新 |
|---|---|
| `legends.top` | `topCenter` |
| `legends.bottom` | `bottomCenter` |
| `legends.left` | `centerLeft` |
| `legends.right` | `centerRight` |

## 不変条件

実装とテストで守る条件です。

1. `keys` 内の `id` は一意。
2. `size.w > 0` かつ `size.h > 0`。
3. `shape === 'rect'` なら `secondary === null` かつ `polygon === null`。
4. `shape === 'custom'` なら `polygon` が 3 点以上。それ以外の非 `rect` 形状は
   `secondary !== null`。
5. `decal === true` のキーは QMK / KiCad / VIA の出力に含めない
   (スイッチが存在しないため)。マトリクスも割り当てない。
6. `matrix` が `null` のキーがあるままで KiCad 出力を行った場合はエラーにする
   (無言で `ROW_0` に落とさない)。
7. `position` は負値を許す。KLE のレイアウトは負座標を含むことがあるため、
   旧アプリのような 0 クランプは行わない ([GEOMETRY.md](GEOMETRY.md#座標の範囲) 参照)。
