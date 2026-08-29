import { describe, expect, it } from 'vitest';
import { addKeys } from '@/core/commands/addKeys';
import { alignKeys } from '@/core/commands/alignKeys';
import { deleteKeys } from '@/core/commands/deleteKeys';
import { distributeKeys } from '@/core/commands/distributeKeys';
import { duplicateKeys } from '@/core/commands/duplicateKeys';
import { moveKeys } from '@/core/commands/moveKeys';
import { rotateKeys } from '@/core/commands/rotateKeys';
import { setMatrix } from '@/core/commands/setMatrix';
import { updateKeyProps } from '@/core/commands/updateKeyProps';
import { createKey } from '@/core/model/key';
import { createProject } from '@/core/model/project';
import type { ProjectModel } from '@/core/model/types';

let seq = 0;
const deps = { newId: () => `id-${(seq++).toString()}`, now: () => 1700000000000 };

function projectWith(keys: ReturnType<typeof createKey>[]): ProjectModel {
  return { ...createProject('Test', deps), keys };
}

function deepFreeze<T>(value: T): T {
  Object.freeze(value);
  if (value !== null && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      if (v !== null && typeof v === 'object') deepFreeze(v);
    }
  }
  return value;
}

describe('純粋性: 入力オブジェクトを変更しない', () => {
  it.each([
    ['moveKeys', (p: ProjectModel) => moveKeys(p, [p.keys[0]!.id], { x: 1, y: 1 })],
    ['deleteKeys', (p: ProjectModel) => deleteKeys(p, [p.keys[0]!.id])],
    ['duplicateKeys', (p: ProjectModel) => duplicateKeys(p, [p.keys[0]!.id], { x: 1, y: 0 }, deps)],
    ['updateKeyProps', (p: ProjectModel) => updateKeyProps(p, [p.keys[0]!.id], { color: '#fff' })],
    ['rotateKeys (single)', (p: ProjectModel) => rotateKeys(p, [p.keys[0]!.id], 90)],
    ['setMatrix', (p: ProjectModel) => setMatrix(p, p.keys[0]!.id, { row: 1, col: 1 })],
    ['addKeys', (p: ProjectModel) => addKeys(p, [{ position: { x: 9, y: 9 } }], {}, deps)],
  ] as const)('%s', (_name, fn) => {
    const project = deepFreeze(projectWith([createKey({ position: { x: 0, y: 0 } }, deps)]));
    expect(() => fn(project)).not.toThrow();
  });
});

describe('addKeys', () => {
  it('partial から生成したキーを追加する', () => {
    const project = projectWith([]);
    const result = addKeys(project, [{ position: { x: 1, y: 2 }, legends: { topCenter: 'A' } }], {}, deps);
    expect(result.keys).toHaveLength(1);
    expect(result.keys[0]!.position).toEqual({ x: 1, y: 2 });
    expect(result.keys[0]!.legends).toEqual({ topCenter: 'A' });
  });

  it('gridSize を指定すると重なりを避けて右にずらす', () => {
    const existing = createKey({ position: { x: 0, y: 0 }, size: { w: 1, h: 1 } }, deps);
    const project = projectWith([existing]);
    const result = addKeys(project, [{ position: { x: 0, y: 0 }, size: { w: 1, h: 1 } }], { gridSize: 1 }, deps);
    const added = result.keys[1]!;
    expect(added.position).toEqual({ x: 1, y: 0 });
  });
});

describe('deleteKeys', () => {
  it('指定した id のキーを削除する', () => {
    const a = createKey({ id: 'a' }, deps);
    const b = createKey({ id: 'b' }, deps);
    const result = deleteKeys(projectWith([a, b]), ['a']);
    expect(result.keys.map((k) => k.id)).toEqual(['b']);
  });
});

describe('moveKeys', () => {
  it('対象キーだけを平行移動する', () => {
    const a = createKey({ id: 'a', position: { x: 0, y: 0 } }, deps);
    const b = createKey({ id: 'b', position: { x: 5, y: 5 } }, deps);
    const result = moveKeys(projectWith([a, b]), ['a'], { x: 1, y: 2 });
    expect(result.keys.find((k) => k.id === 'a')!.position).toEqual({ x: 1, y: 2 });
    expect(result.keys.find((k) => k.id === 'b')!.position).toEqual({ x: 5, y: 5 });
  });

  it('rotation.origin があればそれも一緒に動かす', () => {
    const a = createKey({ id: 'a', position: { x: 0, y: 0 }, rotation: { angle: 30, origin: { x: 1, y: 1 } } }, deps);
    const result = moveKeys(projectWith([a]), ['a'], { x: 2, y: 3 });
    expect(result.keys[0]!.rotation.origin).toEqual({ x: 3, y: 4 });
  });
});

describe('duplicateKeys', () => {
  it('複製したキーは新しい id を持ち、offset 分ずれる (グリッド幅ずらし)', () => {
    const a = createKey({ id: 'a', position: { x: 0, y: 0 } }, deps);
    const result = duplicateKeys(projectWith([a]), ['a'], { x: 1, y: 0 }, deps);
    expect(result.keys).toHaveLength(2);
    const clone = result.keys.find((k) => k.id !== 'a')!;
    expect(clone.position).toEqual({ x: 1, y: 0 });
  });
});

describe('updateKeyProps', () => {
  it('legends は指定したスロットだけ差し替える (他は残る)', () => {
    const a = createKey({ id: 'a', legends: { topCenter: 'A', bottomCenter: 'B' } }, deps);
    const result = updateKeyProps(projectWith([a]), ['a'], { legends: { topCenter: 'A2' } });
    expect(result.keys[0]!.legends).toEqual({ topCenter: 'A2', bottomCenter: 'B' });
  });

  it('その他のフィールドは丸ごと置き換える', () => {
    const a = createKey({ id: 'a', color: null }, deps);
    const result = updateKeyProps(projectWith([a]), ['a'], { color: '#ff0000' });
    expect(result.keys[0]!.color).toBe('#ff0000');
  });
});

describe('setMatrix', () => {
  it('単一キーのマトリクスを設定する', () => {
    const a = createKey({ id: 'a', matrix: null }, deps);
    const result = setMatrix(projectWith([a]), 'a', { row: 2, col: 3 });
    expect(result.keys[0]!.matrix).toEqual({ row: 2, col: 3 });
  });

  it('null を指定すれば未割り当てに戻せる', () => {
    const a = createKey({ id: 'a', matrix: { row: 0, col: 0 } }, deps);
    const result = setMatrix(projectWith([a]), 'a', null);
    expect(result.keys[0]!.matrix).toBeNull();
  });
});

describe('rotateKeys', () => {
  it('単体選択は position を変えず angle だけ加算する', () => {
    const a = createKey({ id: 'a', position: { x: 5, y: 5 }, rotation: { angle: 10, origin: null } }, deps);
    const result = rotateKeys(projectWith([a]), ['a'], 20);
    expect(result.keys[0]!.position).toEqual({ x: 5, y: 5 });
    expect(result.keys[0]!.rotation.angle).toBe(30);
  });

  it('複数選択は選択範囲の中心を軸にオービットする', () => {
    // 2 キー (0,0) と (2,0)、サイズ 1x1 なので AABB 中心は (1.5, 0.5)。
    const a = createKey({ id: 'a', position: { x: 0, y: 0 }, size: { w: 1, h: 1 } }, deps);
    const b = createKey({ id: 'b', position: { x: 2, y: 0 }, size: { w: 1, h: 1 } }, deps);
    const result = rotateKeys(projectWith([a, b]), ['a', 'b'], 180);
    const ra = result.keys.find((k) => k.id === 'a')!;
    const rb = result.keys.find((k) => k.id === 'b')!;
    // 180° 回転なので a と b の position が入れ替わった形になる。
    expect(ra.position.x).toBeCloseTo(3, 4);
    expect(ra.position.y).toBeCloseTo(1, 4);
    expect(rb.position.x).toBeCloseTo(1, 4);
    expect(rb.position.y).toBeCloseTo(1, 4);
    expect(ra.rotation.angle).toBe(180);
    expect(rb.rotation.angle).toBe(180);
  });
});

describe('alignKeys', () => {
  it('left: 最も左のキーに揃える', () => {
    const a = createKey({ id: 'a', position: { x: 0, y: 0 }, size: { w: 1, h: 1 } }, deps);
    const b = createKey({ id: 'b', position: { x: 3, y: 5 }, size: { w: 1, h: 1 } }, deps);
    const result = alignKeys(projectWith([a, b]), ['a', 'b'], 'left');
    expect(result.keys.find((k) => k.id === 'b')!.position.x).toBe(0);
    expect(result.keys.find((k) => k.id === 'a')!.position.x).toBe(0);
  });

  it('centerV: 垂直方向の中心を揃える', () => {
    const a = createKey({ id: 'a', position: { x: 0, y: 0 }, size: { w: 1, h: 1 } }, deps);
    const b = createKey({ id: 'b', position: { x: 5, y: 10 }, size: { w: 1, h: 1 } }, deps);
    const result = alignKeys(projectWith([a, b]), ['a', 'b'], 'centerV');
    const ra = result.keys.find((k) => k.id === 'a')!;
    const rb = result.keys.find((k) => k.id === 'b')!;
    expect(ra.position.y + 0.5).toBeCloseTo(rb.position.y + 0.5, 4);
  });

  it('1 個以下では何もしない', () => {
    const a = createKey({ id: 'a' }, deps);
    const project = projectWith([a]);
    expect(alignKeys(project, ['a'], 'left')).toBe(project);
  });
});

describe('distributeKeys', () => {
  it('水平方向に等間隔に並べ直す (端は動かさない)', () => {
    const a = createKey({ id: 'a', position: { x: 0, y: 0 }, size: { w: 1, h: 1 } }, deps);
    const b = createKey({ id: 'b', position: { x: 3, y: 0 }, size: { w: 1, h: 1 } }, deps);
    const c = createKey({ id: 'c', position: { x: 10, y: 0 }, size: { w: 1, h: 1 } }, deps);
    const result = distributeKeys(projectWith([a, b, c]), ['a', 'b', 'c'], 'horizontal');
    const ra = result.keys.find((k) => k.id === 'a')!;
    const rb = result.keys.find((k) => k.id === 'b')!;
    const rc = result.keys.find((k) => k.id === 'c')!;
    expect(ra.position).toEqual({ x: 0, y: 0 });
    expect(rc.position).toEqual({ x: 10, y: 0 });
    // 全体の幅: c の右端 (11) - a の左端 (0) = 11。キー自身の幅の合計は 1+1+1=3。
    // 隙間の合計は 11-3=8、2 個の隙間に分けると 4 ずつ。
    // b は a の右端 (1) + gap (4) = 5 から始まる。
    expect(rb.position.x).toBeCloseTo(5, 4);
  });

  it('2 個以下では何もしない', () => {
    const a = createKey({ id: 'a' }, deps);
    const b = createKey({ id: 'b', position: { x: 5, y: 0 } }, deps);
    const project = projectWith([a, b]);
    expect(distributeKeys(project, ['a', 'b'], 'horizontal')).toBe(project);
  });
});
