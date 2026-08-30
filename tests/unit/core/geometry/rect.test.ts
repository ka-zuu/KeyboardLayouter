import { describe, expect, it } from 'vitest';
import {
  angleOfHandleFromPivot,
  getRotatedRectAABB,
  getRotatedRectPoints,
  rotatePoint,
  rotatePointPrecalc,
  precalcTrig,
} from '@/core/geometry/rect';

function aabbFromPoints(points: { x: number; y: number }[]) {
  return {
    minX: Math.min(...points.map((p) => p.x)),
    maxX: Math.max(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxY: Math.max(...points.map((p) => p.y)),
  };
}

function approxEqual(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) < eps;
}

describe('getRotatedRectPoints / getRotatedRectAABB', () => {
  it('angle 0 のときは非回転の矩形を返す', () => {
    const points = getRotatedRectPoints(1, 2, 3, 4, 0);
    expect(points).toEqual([
      { x: 1, y: 2 },
      { x: 4, y: 2 },
      { x: 4, y: 6 },
      { x: 1, y: 6 },
    ]);
    expect(getRotatedRectAABB(1, 2, 3, 4, 0)).toEqual({ minX: 1, maxX: 4, minY: 2, maxY: 6 });
  });

  it.each([15, 90, 180, 270])('angle %i° で AABB が頂点計算からの AABB と一致する (相互検証)', (angle) => {
    const cx = 0.5;
    const cy = 0.7;
    const points = getRotatedRectPoints(2, 3, 4, 2, angle, cx, cy);
    const expected = aabbFromPoints(points);
    const actual = getRotatedRectAABB(2, 3, 4, 2, angle, cx, cy);

    expect(approxEqual(actual.minX, expected.minX)).toBe(true);
    expect(approxEqual(actual.maxX, expected.maxX)).toBe(true);
    expect(approxEqual(actual.minY, expected.minY)).toBe(true);
    expect(approxEqual(actual.maxY, expected.maxY)).toBe(true);
  });

  it('precalc を渡しても渡さなくても同じ結果になる', () => {
    const angle = 37;
    const precalc = precalcTrig(angle);
    const withPrecalc = getRotatedRectPoints(0, 0, 1, 1, angle, 0.5, 0.5, precalc);
    const without = getRotatedRectPoints(0, 0, 1, 1, angle, 0.5, 0.5);
    expect(withPrecalc).toEqual(without);
  });

  it('90° 回転で矩形の中心を軸にすると幅と高さが入れ替わった AABB になる', () => {
    // 幅 4, 高さ 2 の矩形を中心 (2,1) 周りに 90° 回すと、
    // 幅 2, 高さ 4 の矩形と同じ AABB になる。
    const aabb = getRotatedRectAABB(0, 0, 4, 2, 90, 2, 1);
    expect(approxEqual(aabb.minX, 1)).toBe(true);
    expect(approxEqual(aabb.maxX, 3)).toBe(true);
    expect(approxEqual(aabb.minY, -1)).toBe(true);
    expect(approxEqual(aabb.maxY, 3)).toBe(true);
  });
});

describe('rotatePoint / rotatePointPrecalc', () => {
  it('同じ結果になる', () => {
    const { sin, cos } = precalcTrig(45);
    expect(rotatePoint({ x: 1, y: 0 }, { x: 0, y: 0 }, 45)).toEqual(rotatePointPrecalc({ x: 1, y: 0 }, { x: 0, y: 0 }, sin, cos));
  });

  it('360° 回転すると元の点に戻る', () => {
    const p = rotatePoint({ x: 3, y: 4 }, { x: 1, y: 1 }, 360);
    expect(approxEqual(p.x, 3)).toBe(true);
    expect(approxEqual(p.y, 4)).toBe(true);
  });
});

describe('angleOfHandleFromPivot', () => {
  const pivot = { x: 0, y: 0 };

  it('真上 (0, -1) は 0°', () => {
    expect(approxEqual(angleOfHandleFromPivot({ x: 0, y: -1 }, pivot), 0)).toBe(true);
  });

  it('真右 (1, 0) は 90°', () => {
    expect(approxEqual(angleOfHandleFromPivot({ x: 1, y: 0 }, pivot), 90)).toBe(true);
  });

  it('真下 (0, 1) は 180°', () => {
    expect(approxEqual(angleOfHandleFromPivot({ x: 0, y: 1 }, pivot), 180)).toBe(true);
  });

  it('真左 (-1, 0) は 270°', () => {
    expect(approxEqual(angleOfHandleFromPivot({ x: -1, y: 0 }, pivot), 270)).toBe(true);
  });

  it('pivot がキーの中心からずれていても正しく計算する', () => {
    const offCenterPivot = { x: 5, y: 5 };
    expect(approxEqual(angleOfHandleFromPivot({ x: 5, y: 4 }, offCenterPivot), 0)).toBe(true);
  });
});
