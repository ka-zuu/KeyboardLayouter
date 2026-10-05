import { defaultDeps, type ModelDeps } from './deps';
import type { KeyModel, KeyShape, Legends, LegendSlot, SecondaryRect, SizeU } from './types';

/**
 * shape ごとの標準副矩形。size (主矩形の寸法) を基準に、キー左上を原点とした
 * 相対座標 (U) で返す。'rect' には副矩形が無いので null。
 *
 * ISO Enter とステップドの寸法は docs/MIGRATION_FROM_MKD.md の
 * 「ISO Enter / ステップドの副矩形」の対応表と同じ (旧アプリの
 * variant からの移行で使う補完値でもある)。Big-Ass Enter は
 * docs/DATA_MODEL.md の shape 定義 (副矩形が左下) に沿う。
 */
export function defaultSecondaryFor(shape: KeyShape, size: SizeU): SecondaryRect | null {
  switch (shape) {
    case 'rect':
    case 'custom':
      return null;
    case 'isoEnter':
      return { x: 0.25, y: 1, w: 1.25, h: 1 };
    case 'steppedCaps':
      return { x: 0, y: 0, w: size.w * 0.75, h: size.h };
    case 'bigAssEnter':
      return { x: 0, y: 1, w: size.w, h: size.h };
  }
}

export function createKey(partial: Partial<KeyModel> = {}, deps: ModelDeps = defaultDeps): KeyModel {
  return {
    id: deps.newId(),
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

/** キーを複製する。id は新規に振り直す。 */
export function cloneKey(key: KeyModel, deps: ModelDeps = defaultDeps): KeyModel {
  return {
    ...key,
    id: deps.newId(),
    position: { ...key.position },
    size: { ...key.size },
    rotation: { angle: key.rotation.angle, origin: key.rotation.origin ? { ...key.rotation.origin } : null },
    secondary: key.secondary ? { ...key.secondary } : null,
    polygon: key.polygon ? key.polygon.map((p) => ({ ...p })) : null,
    legends: { ...key.legends },
  };
}

/** キーの不変更新。patch に含まれるフィールドだけを差し替えた新しいオブジェクトを返す。 */
export function withKey(key: KeyModel, patch: Partial<KeyModel>): KeyModel {
  return { ...key, ...patch };
}

/** 12 スロットの並び順 (上段 → 中段 → 下段 → 前面、各段は左 → 右)。KLE のスロット番号順とは異なる。 */
export const LEGEND_SLOT_ORDER: readonly LegendSlot[] = [
  'topLeft',
  'topCenter',
  'topRight',
  'centerLeft',
  'center',
  'centerRight',
  'bottomLeft',
  'bottomCenter',
  'bottomRight',
  'frontLeft',
  'frontCenter',
  'frontRight',
];

/**
 * 主刻印のスロット (docs/UI_SPEC.md#操作 のダブルクリック編集の対象)。
 * `LEGEND_SLOT_ORDER` の順で最初に値が入っているスロット。刻印が 1 つも無ければ `center`。
 */
export function primaryLegendSlotOf(key: Pick<KeyModel, 'legends'>): LegendSlot {
  return LEGEND_SLOT_ORDER.find((slot) => (key.legends[slot] ?? '') !== '') ?? 'center';
}

/** 1 スロットだけ差し替えた刻印を返す。空文字はスロットごと消す (`Legends` は空文字を持たない)。 */
export function withLegend(legends: Legends, slot: LegendSlot, text: string): Legends {
  const next = { ...legends };
  if (text === '') delete next[slot];
  else next[slot] = text;
  return next;
}
