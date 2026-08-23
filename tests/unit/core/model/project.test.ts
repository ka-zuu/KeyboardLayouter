import { describe, expect, it } from 'vitest';
import { createKey } from '@/core/model/key';
import { createProject, findKey, normalizeOrigin, replaceKeys, sortKeysForOutput, touch } from '@/core/model/project';

const deps = { newId: () => 'new-id', now: () => 1700000000123 };

describe('createProject', () => {
  it('既定値どおりのプロジェクトを作る', () => {
    const project = createProject('My KB', deps);
    expect(project).toMatchObject({
      schemaVersion: 1,
      name: 'My KB',
      keys: [],
      meta: {
        keyboardName: 'My KB',
        usb: { vid: '0xFEED', pid: '0x0000', deviceVersion: '0.0.1' },
        diodeDirection: 'COL2ROW',
        split: false,
      },
      createdAt: 1700000000123,
      updatedAt: 1700000000123,
    });
  });
});

describe('findKey / replaceKeys', () => {
  it('id でキーを探す', () => {
    const k1 = createKey({ id: 'a' }, deps);
    const project = { ...createProject('T', deps), keys: [k1] };
    expect(findKey(project, 'a')).toEqual(k1);
    expect(findKey(project, 'missing')).toBeNull();
  });

  it('指定した id のキーだけを差し替える', () => {
    const k1 = createKey({ id: 'a', legends: { topCenter: 'A' } }, deps);
    const k2 = createKey({ id: 'b', legends: { topCenter: 'B' } }, deps);
    const project = { ...createProject('T', deps), keys: [k1, k2] };
    const updated = replaceKeys(project, new Map([['a', { ...k1, legends: { topCenter: 'A2' } }]]));
    expect(updated.keys[0]!.legends).toEqual({ topCenter: 'A2' });
    expect(updated.keys[1]).toEqual(k2);
  });
});

describe('touch', () => {
  it('updatedAt を更新する', () => {
    const project = createProject('T', { newId: () => 'x', now: () => 1 });
    const touched = touch(project, { newId: () => 'x', now: () => 999 });
    expect(touched.updatedAt).toBe(999);
    expect(touched.createdAt).toBe(1);
  });
});

describe('normalizeOrigin', () => {
  it('全キーの AABB 左上が原点になるよう平行移動する', () => {
    const k1 = createKey({ position: { x: 2, y: 3 }, size: { w: 1, h: 1 } }, deps);
    const k2 = createKey({ position: { x: 5, y: -1 }, size: { w: 1, h: 1 } }, deps);
    const project = { ...createProject('T', deps), keys: [k1, k2] };
    const normalized = normalizeOrigin(project);
    // 元の AABB は minX=2, minY=-1 なので、dx=-2, dy=1。
    expect(normalized.keys[0]!.position).toEqual({ x: 0, y: 4 });
    expect(normalized.keys[1]!.position).toEqual({ x: 3, y: 0 });
  });

  it('rotation.origin も同じ量だけ平行移動する', () => {
    // angle: 0 にして AABB 計算を単純にし、position と origin が
    // 同じ dx/dy でずれることだけを検証する。
    const k1 = createKey(
      { position: { x: 1, y: 1 }, size: { w: 1, h: 1 }, rotation: { angle: 0, origin: { x: 2, y: 2 } } },
      deps,
    );
    const project = { ...createProject('T', deps), keys: [k1] };
    const normalized = normalizeOrigin(project);
    expect(normalized.keys[0]!.position).toEqual({ x: 0, y: 0 });
    expect(normalized.keys[0]!.rotation.origin).toEqual({ x: 1, y: 1 });
  });

  it('元がすでに原点にある場合は同じ参照を返す', () => {
    const k1 = createKey({ position: { x: 0, y: 0 }, size: { w: 1, h: 1 } }, deps);
    const project = { ...createProject('T', deps), keys: [k1] };
    expect(normalizeOrigin(project)).toBe(project);
  });

  it('キーが 0 件のときは何もしない', () => {
    const project = createProject('T', deps);
    expect(normalizeOrigin(project)).toBe(project);
  });
});

describe('sortKeysForOutput', () => {
  it('マトリクス割り当て済みなら Row → Col の順', () => {
    const a = createKey({ id: 'a', matrix: { row: 1, col: 0 } }, deps);
    const b = createKey({ id: 'b', matrix: { row: 0, col: 1 } }, deps);
    const c = createKey({ id: 'c', matrix: { row: 0, col: 0 } }, deps);
    const sorted = sortKeysForOutput([a, b, c]);
    expect(sorted.map((k) => k.id)).toEqual(['c', 'b', 'a']);
  });

  it('マトリクス未割り当てなら Y → X の順', () => {
    const a = createKey({ id: 'a', position: { x: 1, y: 0 } }, deps);
    const b = createKey({ id: 'b', position: { x: 0, y: 1 } }, deps);
    const c = createKey({ id: 'c', position: { x: 0, y: 0 } }, deps);
    const sorted = sortKeysForOutput([a, b, c]);
    expect(sorted.map((k) => k.id)).toEqual(['c', 'a', 'b']);
  });

  it('元の配列を変更しない', () => {
    const a = createKey({ id: 'a', position: { x: 1, y: 0 } }, deps);
    const b = createKey({ id: 'b', position: { x: 0, y: 0 } }, deps);
    const original = [a, b];
    sortKeysForOutput(original);
    expect(original).toEqual([a, b]);
  });
});
