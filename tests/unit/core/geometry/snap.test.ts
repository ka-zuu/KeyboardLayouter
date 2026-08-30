import { describe, expect, it } from 'vitest';
import { round4, snapAngle, snapMoveDelta, snapU } from '@/core/geometry/snap';

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

describe('snapMoveDelta', () => {
  it('アンカーがグリッド外でも、結果の絶対位置がグリッドに乗る', () => {
    // アンカーが (0.1, 0.1) というグリッド外の位置。0.05 だけ動かしても
    // delta 自体をスナップすると 0 になってしまうが、絶対位置基準なら
    // 最寄りのグリッド線 (0.25) に乗るはずの delta が返る。
    const delta = snapMoveDelta({ x: 0.1, y: 0.1 }, { x: 0.05, y: 0 }, 0.25, true);
    expect(delta.x).toBeCloseTo(0.15, 9); // 0.1 + 0.15 = 0.25 (最寄りグリッド)
    expect(delta.y).toBeCloseTo(-0.1, 9); // 0.1 + (-0.1) = 0 (最寄りグリッド)
  });

  it('無効時は raw delta をそのまま返す', () => {
    const delta = snapMoveDelta({ x: 0.13, y: 0.07 }, { x: 0.3, y: -0.2 }, 0.25, false);
    expect(delta).toEqual({ x: 0.3, y: -0.2 });
  });

  it('負方向への移動でも正しくスナップする', () => {
    const delta = snapMoveDelta({ x: 2, y: 2 }, { x: -1.9, y: 0 }, 1, true);
    expect(delta.x).toBeCloseTo(-2, 9); // 2 + (-2) = 0
  });

  it('アンカーが既にグリッド上なら delta もグリッド刻みになる', () => {
    const delta = snapMoveDelta({ x: 1, y: 1 }, { x: 0.6, y: 0 }, 0.5, true);
    expect(delta.x).toBeCloseTo(0.5, 9); // 1 + 0.5 = 1.5 (最寄りグリッド)
  });
});

describe('snapAngle', () => {
  it('無効時はそのまま返す', () => {
    expect(snapAngle(37, false)).toBe(37);
  });

  it('既定の 15° 刻みに丸める', () => {
    expect(snapAngle(7, true)).toBe(0);
    expect(snapAngle(8, true)).toBe(15);
    expect(snapAngle(22, true)).toBe(15);
    expect(snapAngle(23, true)).toBe(30);
  });

  it('刻み幅を指定できる', () => {
    expect(snapAngle(40, true, 45)).toBe(45);
  });

  it('負の角度も丸める', () => {
    expect(snapAngle(-8, true)).toBe(-15);
  });
});
