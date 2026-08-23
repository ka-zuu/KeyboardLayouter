import { describe, expect, it } from 'vitest';
import { doPolygonsIntersect, isPolygonInsideConvex } from '@/core/geometry/sat';

const square = (x: number, y: number, size = 1) => [
  { x, y },
  { x: x + size, y },
  { x: x + size, y: y + size },
  { x, y: y + size },
];

describe('doPolygonsIntersect (SAT)', () => {
  it('完全に離れている場合は交差しない', () => {
    expect(doPolygonsIntersect(square(0, 0), square(5, 5))).toBe(false);
  });

  it('接している場合は交差する (境界を共有)', () => {
    expect(doPolygonsIntersect(square(0, 0), square(1, 0))).toBe(true);
  });

  it('少しだけ重なる場合は交差する', () => {
    expect(doPolygonsIntersect(square(0, 0), square(0.9, 0))).toBe(true);
  });

  it('完全に含む場合は交差する', () => {
    const outer = square(0, 0, 4);
    const inner = square(1, 1, 1);
    expect(doPolygonsIntersect(outer, inner)).toBe(true);
  });

  it('回転した矩形同士でも判定できる', () => {
    // 45° 回転したひし形と、原点付近の矩形。
    const diamond = [
      { x: 0, y: -1.5 },
      { x: 1.5, y: 0 },
      { x: 0, y: 1.5 },
      { x: -1.5, y: 0 },
    ];
    expect(doPolygonsIntersect(diamond, square(-0.1, -0.1, 0.2))).toBe(true);
    expect(doPolygonsIntersect(diamond, square(5, 5, 0.2))).toBe(false);
  });
});

describe('isPolygonInsideConvex', () => {
  it('完全に内側なら true', () => {
    expect(isPolygonInsideConvex(square(1, 1, 1), square(0, 0, 4))).toBe(true);
  });

  it('一部でもはみ出していれば false', () => {
    expect(isPolygonInsideConvex(square(3, 3, 2), square(0, 0, 4))).toBe(false);
  });

  it('境界にぴったり接する場合は内側とみなす', () => {
    expect(isPolygonInsideConvex(square(0, 0, 4), square(0, 0, 4))).toBe(true);
  });
});
