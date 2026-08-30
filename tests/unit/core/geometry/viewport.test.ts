import { describe, expect, it } from 'vitest';
import { screenToLayout } from '@/core/geometry/units';
import {
  MAX_SCALE,
  MIN_SCALE,
  clampScale,
  fitToAABB,
  scaleFromWheelDelta,
  visibleAABB,
  zoomAt,
} from '@/core/geometry/viewport';

describe('clampScale', () => {
  it('範囲内の値はそのまま返す', () => {
    expect(clampScale(1)).toBe(1);
  });

  it('下限未満は下限に、上限超過は上限にクランプする', () => {
    expect(clampScale(0)).toBe(MIN_SCALE);
    expect(clampScale(100)).toBe(MAX_SCALE);
  });
});

describe('zoomAt', () => {
  it('カーソル位置のレイアウト座標がズーム前後で変わらない', () => {
    const current = { scale: 1, panPx: { x: 50, y: 20 } };
    const cursorPx = { x: 300, y: 200 };
    const before = screenToLayout(cursorPx, current.scale, current.panPx);

    const next = zoomAt(current, cursorPx, 2);
    const after = screenToLayout(cursorPx, next.scale, next.panPx);

    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
    expect(next.scale).toBe(2);
  });

  it('次の scale もクランプされる', () => {
    const current = { scale: 1, panPx: { x: 0, y: 0 } };
    const next = zoomAt(current, { x: 0, y: 0 }, 999);
    expect(next.scale).toBe(MAX_SCALE);
  });

  it('scale が変化しないときは同じ viewport を返す', () => {
    const current = { scale: 1, panPx: { x: 10, y: 10 } };
    const next = zoomAt(current, { x: 5, y: 5 }, 1);
    expect(next).toBe(current);
  });
});

describe('scaleFromWheelDelta', () => {
  it('正のデルタ (下スクロール) で縮小する', () => {
    expect(scaleFromWheelDelta(1, 100)).toBeLessThan(1);
  });

  it('負のデルタ (上スクロール) で拡大する', () => {
    expect(scaleFromWheelDelta(1, -100)).toBeGreaterThan(1);
  });

  it('結果はクランプされる', () => {
    expect(scaleFromWheelDelta(MIN_SCALE, 100000)).toBe(MIN_SCALE);
    expect(scaleFromWheelDelta(MAX_SCALE, -100000)).toBe(MAX_SCALE);
  });
});

describe('fitToAABB', () => {
  it('AABB が null のとき (キー0件) は中央に scale=1', () => {
    const viewport = fitToAABB(null, { width: 800, height: 600 });
    expect(viewport.scale).toBe(1);
    expect(viewport.panPx).toEqual({ x: 400, y: 300 });
  });

  it('結果の viewport で AABB の四隅がビューポート内に収まる', () => {
    const aabb = { minX: 0, maxX: 15, minY: 0, maxY: 5 };
    const viewportPx = { width: 800, height: 600 };
    const viewport = fitToAABB(aabb, viewportPx, 1);

    for (const p of [
      { x: aabb.minX, y: aabb.minY },
      { x: aabb.maxX, y: aabb.maxY },
    ]) {
      const screen = { x: p.x * 60 * viewport.scale + viewport.panPx.x, y: p.y * 60 * viewport.scale + viewport.panPx.y };
      expect(screen.x).toBeGreaterThanOrEqual(-1e-6);
      expect(screen.x).toBeLessThanOrEqual(viewportPx.width + 1e-6);
      expect(screen.y).toBeGreaterThanOrEqual(-1e-6);
      expect(screen.y).toBeLessThanOrEqual(viewportPx.height + 1e-6);
    }
  });
});

describe('visibleAABB', () => {
  it('scale=1, panPx=0 のとき、ビューポートの右下端がそのまま U 座標になる', () => {
    const box = visibleAABB({ scale: 1, panPx: { x: 0, y: 0 } }, { width: 600, height: 300 });
    expect(box.minX).toBeCloseTo(0, 9);
    expect(box.minY).toBeCloseTo(0, 9);
    expect(box.maxX).toBeCloseTo(10, 9);
    expect(box.maxY).toBeCloseTo(5, 9);
  });

  it('パンした分だけ範囲がずれる', () => {
    const box = visibleAABB({ scale: 1, panPx: { x: -60, y: 0 } }, { width: 600, height: 300 });
    expect(box.minX).toBeCloseTo(1, 9);
    expect(box.maxX).toBeCloseTo(11, 9);
  });
});
