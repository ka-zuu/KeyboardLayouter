import { describe, expect, it } from 'vitest';
import { aabbOfKey, aabbOfKeys, boundingRadiusOf, outlineOf } from '@/core/geometry/shape';
import { createKey } from '@/core/model/key';
import { defaultSecondaryFor } from '@/core/model/key';

describe('outlineOf', () => {
  it('rect は主矩形の 4 頂点そのまま', () => {
    const key = createKey({ size: { w: 2, h: 1 } });
    expect(outlineOf(key)).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 0, y: 1 },
    ]);
  });

  it('isoEnter は docs/GEOMETRY.md#キー形状の輪郭 の 6 点パスと一致する', () => {
    const size = { w: 1.5, h: 1 };
    const key = createKey({ size, shape: 'isoEnter', secondary: defaultSecondaryFor('isoEnter', size) });
    expect(outlineOf(key)).toEqual([
      { x: 0, y: 0 },
      { x: 1.5, y: 0 },
      { x: 1.5, y: 2 },
      { x: 0.25, y: 2 },
      { x: 0.25, y: 1 },
      { x: 0, y: 1 },
    ]);
  });

  it('steppedCaps の副矩形は主矩形に含まれるため、輪郭は主矩形の 4 頂点になる', () => {
    const size = { w: 2, h: 1 };
    const key = createKey({ size, shape: 'steppedCaps', secondary: defaultSecondaryFor('steppedCaps', size) });
    expect(outlineOf(key)).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 0, y: 1 },
    ]);
  });

  it('custom は polygon をそのまま使う', () => {
    const polygon = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.5, y: 1 },
    ];
    const key = createKey({ shape: 'custom', polygon });
    expect(outlineOf(key)).toEqual(polygon);
  });
});

describe('aabbOfKey / boundingRadiusOf', () => {
  it('回転していない rect の AABB は position と size から求まる', () => {
    const key = createKey({ position: { x: 1, y: 2 }, size: { w: 3, h: 4 } });
    expect(aabbOfKey(key)).toEqual({ minX: 1, maxX: 4, minY: 2, maxY: 6 });
  });

  it('isoEnter の AABB は副矩形を含む', () => {
    const size = { w: 1.5, h: 1 };
    const key = createKey({ position: { x: 0, y: 0 }, size, shape: 'isoEnter', secondary: defaultSecondaryFor('isoEnter', size) });
    expect(aabbOfKey(key)).toEqual({ minX: 0, maxX: 1.5, minY: 0, maxY: 2 });
  });

  it('包含円の半径は回転中心から最遠頂点までの距離', () => {
    const key = createKey({ position: { x: 0, y: 0 }, size: { w: 1, h: 1 } });
    // 幾何中心 (0.5,0.5) から角 (0,0) までの距離は sqrt(0.5)。
    expect(boundingRadiusOf(key)).toBeCloseTo(Math.sqrt(0.5), 10);
  });
});

describe('aabbOfKeys', () => {
  it('複数キーの和集合になる', () => {
    const a = createKey({ position: { x: 0, y: 0 }, size: { w: 1, h: 1 } });
    const b = createKey({ position: { x: 5, y: -2 }, size: { w: 1, h: 1 } });
    expect(aabbOfKeys([a, b])).toEqual({ minX: 0, maxX: 6, minY: -2, maxY: 1 });
  });

  it('キーが 0 件のときは null', () => {
    expect(aabbOfKeys([])).toBeNull();
  });
});
