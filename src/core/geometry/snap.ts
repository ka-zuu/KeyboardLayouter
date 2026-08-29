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
