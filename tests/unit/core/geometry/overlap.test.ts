import { describe, expect, it } from 'vitest';
import { doKeysOverlap, overlappingKeyIds } from '@/core/geometry/overlap';
import { createKey, defaultSecondaryFor } from '@/core/model/key';
import type { KeyModel } from '@/core/model/types';

function keyAt(id: string, x: number, y: number, extra: Partial<KeyModel> = {}): KeyModel {
  return createKey({ id, position: { x, y }, ...extra });
}

describe('doKeysOverlap', () => {
  it('食い込んでいれば重なり', () => {
    expect(doKeysOverlap(keyAt('a', 0, 0), keyAt('b', 0.5, 0))).toBe(true);
  });

  it('辺を共有して隣接しているだけなら重なりではない', () => {
    expect(doKeysOverlap(keyAt('a', 0, 0), keyAt('b', 1, 0))).toBe(false);
    expect(doKeysOverlap(keyAt('a', 0, 0), keyAt('b', 0, 1))).toBe(false);
    expect(doKeysOverlap(keyAt('a', 0, 0), keyAt('b', 1, 1))).toBe(false);
  });

  it('離れていれば重なりではない', () => {
    expect(doKeysOverlap(keyAt('a', 0, 0), keyAt('b', 3, 0))).toBe(false);
  });

  it('回転を考慮する (45° 回転したキーの角が隣のキーに食い込む)', () => {
    const rotated = keyAt('a', 0, 0, { rotation: { angle: 45, origin: null } });
    // 回転前は x=1 で接しているだけだが、45° 回転すると角が x≈1.207 まで張り出す。
    expect(doKeysOverlap(rotated, keyAt('b', 1, 0))).toBe(true);
    expect(doKeysOverlap(rotated, keyAt('b', 1.25, 0))).toBe(false);
  });

  it('ISO Enter は凹形状のくぼみ部分にあるキーと重ならない', () => {
    const size = { w: 1.5, h: 1 };
    const iso = keyAt('iso', 0, 0, { size, shape: 'isoEnter', secondary: defaultSecondaryFor('isoEnter', size) });
    // 輪郭は (0,0)→(1.5,0)→(1.5,2)→(0.25,2)→(0.25,1)→(0,1)。左下 (x<0.25, y>1) はくぼみ。
    const inNotch = keyAt('n', -0.75, 1);
    expect(doKeysOverlap(iso, inNotch)).toBe(false);
    // 副矩形 (下段) に食い込むキーは重なり。
    expect(doKeysOverlap(iso, keyAt('m', -0.5, 1))).toBe(true);
  });
});

describe('overlappingKeyIds', () => {
  it('対象キーと重なっているものだけ返す (対象以外同士の重なりは無視)', () => {
    const keys = [keyAt('a', 0, 0), keyAt('b', 0.5, 0), keyAt('c', 5, 0), keyAt('d', 5.5, 0), keyAt('e', 10, 0)];
    expect(overlappingKeyIds(keys, ['a'])).toEqual(['a']);
    expect(overlappingKeyIds(keys, ['e'])).toEqual([]);
    expect(overlappingKeyIds(keys, ['a', 'b', 'e'])).toEqual(['a', 'b']);
  });

  it('対象が空なら空', () => {
    expect(overlappingKeyIds([keyAt('a', 0, 0), keyAt('b', 0, 0)], [])).toEqual([]);
  });

  it('隙間なく並んだ 1 行 (60% 相当の 15 キー) は重なりなし', () => {
    const keys = Array.from({ length: 15 }, (_, i) => keyAt(`k${i.toString()}`, i, 0));
    expect(overlappingKeyIds(keys, keys.map((k) => k.id))).toEqual([]);
  });

  it('1000 キー全選択でも短時間で終わる', () => {
    const keys = Array.from({ length: 1000 }, (_, i) => keyAt(`k${i.toString()}`, i % 40, Math.floor(i / 40)));
    const start = performance.now();
    expect(overlappingKeyIds(keys, keys.map((k) => k.id))).toEqual([]);
    expect(performance.now() - start).toBeLessThan(200);
  });
});
