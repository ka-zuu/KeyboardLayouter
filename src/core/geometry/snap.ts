import type { PointU } from '@/core/model/types';

/** 小数第 4 位で丸める。スナップ結果の浮動小数誤差の蓄積を避けるため。 */
export function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/**
 * 値をグリッドにスナップする。無効化されているときはそのまま返す。
 * 位置・サイズ・移動量に適用する。回転角には使わない
 * (回転は Shift 押下時のみ 15° 刻みにする。呼び出し側の責務)。
 */
export function snapU(valueU: number, gridSize: number, enabled: boolean): number {
  if (!enabled) return valueU;
  return round4(Math.round(valueU / gridSize) * gridSize);
}

/**
 * ドラッグ主体キー (アンカー) の絶対位置をスナップし、その結果から実際の移動量を
 * 逆算する。単純に delta 自体をスナップすると、元々グリッド外にあるキーが
 * ドラッグ後もグリッドに乗らないため、常に「アンカーの絶対位置」を基準にする。
 */
export function snapMoveDelta(anchorStart: PointU, rawDelta: PointU, gridSize: number, enabled: boolean): PointU {
  const desiredX = anchorStart.x + rawDelta.x;
  const desiredY = anchorStart.y + rawDelta.y;
  const snappedX = snapU(desiredX, gridSize, enabled);
  const snappedY = snapU(desiredY, gridSize, enabled);
  return { x: round4(snappedX - anchorStart.x), y: round4(snappedY - anchorStart.y) };
}

/**
 * 回転角を `Shift` 押下時のみ刻み幅 (既定 15°) に丸める。
 * `snapU` と異なり、既定では素通り (回転角にはスナップを適用しないため)。
 */
export function snapAngle(angleDeg: number, enabled: boolean, step = 15): number {
  if (!enabled) return angleDeg;
  return Math.round(angleDeg / step) * step;
}
