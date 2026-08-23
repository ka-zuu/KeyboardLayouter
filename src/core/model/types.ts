/**
 * データモデルの型定義。docs/DATA_MODEL.md と 1 対 1 に保つこと。
 */

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

/** 編集状態 (永続化されない / 履歴に載らない)。 */
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
