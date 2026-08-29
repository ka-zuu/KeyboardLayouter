import { describe, expect, it } from 'vitest';
import { round4, snapU } from '@/core/geometry/snap';

describe('snapU', () => {
  it('無効時はそのまま返す', () => {
    expect(snapU(1.234, 0.25, false)).toBe(1.234);
  });

  it('負値もグリッドにスナップする', () => {
    expect(snapU(-1.1, 0.25, true)).toBe(-1);
    expect(snapU(-1.4, 0.25, true)).toBe(-1.5);
  });

  it('ちょうど半分の値は最近接の偶数側ではなく Math.round の仕様どおり丸める', () => {
    // 0.125 を 0.25 グリッドでスナップすると 0.25 に丸まる (Math.round(0.5) === 1)。
    expect(snapU(0.125, 0.25, true)).toBe(0.25);
  });

  it('浮動小数の誤差を蓄積しない (小数第 4 位までに丸める)', () => {
    const result = snapU(0.1 + 0.2, 0.1, true);
    expect(result).toBe(0.3);
  });
});

describe('round4', () => {
  it('小数第 4 位に丸める', () => {
    expect(round4(1.23456)).toBe(1.2346);
    expect(round4(0.1 + 0.2)).toBe(0.3);
  });
});
