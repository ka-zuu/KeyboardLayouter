import { describe, expect, it } from 'vitest';
import { keysIntersectingRect } from '@/core/geometry/select';
import { createKey } from '@/core/model/key';

describe('keysIntersectingRect (3 段構えの選択判定)', () => {
  it('AABB 判定: 回転していないキーは交差モードで少しでも重なれば選択される', () => {
    const key = createKey({ position: { x: 0, y: 0 }, size: { w: 1, h: 1 } });
    const rect = { minX: 0.5, maxX: 2, minY: 0.5, maxY: 2 };
    expect(keysIntersectingRect([key], rect)).toEqual([key.id]);
  });

  it('包含モード: キー全体が範囲に入っていないと選択されない', () => {
    const key = createKey({ position: { x: 0, y: 0 }, size: { w: 1, h: 1 } });
    const rect = { minX: 0.5, maxX: 2, minY: 0.5, maxY: 2 };
    expect(keysIntersectingRect([key], rect, 'contain')).toEqual([]);
    expect(keysIntersectingRect([key], { minX: -1, maxX: 2, minY: -1, maxY: 2 }, 'contain')).toEqual([key.id]);
  });

  it('回転しているキーも SAT で正しく判定する', () => {
    // 45° 回転した 1x1 キー (中心 (0.5,0.5)) は、対角線が root(2) ≈ 1.414 に伸びる。
    const key = createKey({ position: { x: 0, y: 0 }, size: { w: 1, h: 1 }, rotation: { angle: 45, origin: null } });
    // 角の先端付近だけを含む小さい矩形。
    const rect = { minX: 0.4, maxX: 0.6, minY: -0.3, maxY: 0.1 };
    expect(keysIntersectingRect([key], rect)).toEqual([key.id]);
  });

  it('包含円判定で早期に除外される (回転キーが選択範囲から遠い)', () => {
    const key = createKey({ position: { x: 100, y: 100 }, size: { w: 1, h: 1 }, rotation: { angle: 30, origin: null } });
    const rect = { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    expect(keysIntersectingRect([key], rect)).toEqual([]);
  });

  it('離れている回転キーは交差しない', () => {
    const key = createKey({ position: { x: 5, y: 5 }, size: { w: 1, h: 1 }, rotation: { angle: 20, origin: null } });
    const rect = { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    expect(keysIntersectingRect([key], rect)).toEqual([]);
  });
});
