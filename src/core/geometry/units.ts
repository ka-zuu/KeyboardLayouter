import type { PointU } from '@/core/model/types';

/** 1U の物理寸法 (mm)。Cherry MX の標準ピッチ。 */
export const MM_PER_U = 19.05;

/** 画面上での 1U の基準ピクセル数 (scale = 1 のとき)。 */
export const PX_PER_U = 60;

/** 座標の同一視に使う許容誤差 (U)。0.05U グリッドより十分小さい値。 */
export const EPSILON_U = 1e-4;

/** 同じ行と見なす Y 座標の差 (U)。マトリクス自動割り当てで使う。 */
export const ROW_TOLERANCE_U = 0.1;

export const uToMm = (u: number): number => u * MM_PER_U;
export const mmToU = (mm: number): number => mm / MM_PER_U;

export const uToPx = (u: number, scale: number): number => u * PX_PER_U * scale;
export const pxToU = (px: number, scale: number): number => px / (PX_PER_U * scale);

/** 画面座標 → レイアウト座標 */
export function screenToLayout(pointPx: PointU, scale: number, panPx: PointU): PointU {
  return {
    x: (pointPx.x - panPx.x) / (PX_PER_U * scale),
    y: (pointPx.y - panPx.y) / (PX_PER_U * scale),
  };
}

/** レイアウト座標 → 画面座標 */
export function layoutToScreen(pointU: PointU, scale: number, panPx: PointU): PointU {
  return {
    x: pointU.x * PX_PER_U * scale + panPx.x,
    y: pointU.y * PX_PER_U * scale + panPx.y,
  };
}
