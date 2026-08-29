import { describe, expect, it } from 'vitest';
import { autoAssignMatrix } from '@/core/matrix/autoAssign';
import { createKey } from '@/core/model/key';
import { createProject } from '@/core/model/project';
import type { ProjectModel } from '@/core/model/types';

let seq = 0;
const deps = { newId: () => `id-${(seq++).toString()}`, now: () => 1700000000000 };

function projectWith(keys: ReturnType<typeof createKey>[]): ProjectModel {
  return { ...createProject('Test', deps), keys };
}

describe('autoAssignMatrix', () => {
  it('4x4 の格子配置に基本的な Row/Col を割り当てる', () => {
    const keys = [];
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        keys.push(createKey({ position: { x: col, y: row }, size: { w: 1, h: 1 } }, deps));
      }
    }
    const project = projectWith(keys);
    const result = autoAssignMatrix(project, null, { startRow: 0, startCol: 0 });
    const byPos = (x: number, y: number) => result.keys.find((k) => k.position.x === x && k.position.y === y)!;
    expect(byPos(0, 0).matrix).toEqual({ row: 0, col: 0 });
    expect(byPos(1, 0).matrix).toEqual({ row: 0, col: 1 });
    expect(byPos(0, 1).matrix).toEqual({ row: 1, col: 0 });
    expect(byPos(1, 1).matrix).toEqual({ row: 1, col: 1 });
  });

  it('開始 Row / Col を指定できる', () => {
    const keys = [createKey({ position: { x: 0, y: 0 } }, deps), createKey({ position: { x: 1, y: 0 } }, deps)];
    const project = projectWith(keys);
    const result = autoAssignMatrix(project, null, { startRow: 3, startCol: 7 });
    expect(result.keys[0]!.matrix).toEqual({ row: 3, col: 7 });
    expect(result.keys[1]!.matrix).toEqual({ row: 3, col: 8 });
  });

  it('選択キーのみを対象にした場合、対象外のキーは変わらない', () => {
    const untouched = createKey({ position: { x: 0, y: 0 }, matrix: { row: 9, col: 9 } }, deps);
    const target = createKey({ position: { x: 1, y: 0 } }, deps);
    const project = projectWith([untouched, target]);
    const result = autoAssignMatrix(project, [target.id], { startRow: 0, startCol: 0 });
    expect(result.keys.find((k) => k.id === untouched.id)!.matrix).toEqual({ row: 9, col: 9 });
    expect(result.keys.find((k) => k.id === target.id)!.matrix).toEqual({ row: 0, col: 0 });
  });

  it('decal のキーは対象から除外される', () => {
    const decal = createKey({ position: { x: 0, y: 0 }, decal: true }, deps);
    const normal = createKey({ position: { x: 1, y: 0 } }, deps);
    const project = projectWith([decal, normal]);
    const result = autoAssignMatrix(project, null, { startRow: 0, startCol: 0 });
    expect(result.keys.find((k) => k.id === decal.id)!.matrix).toBeNull();
    expect(result.keys.find((k) => k.id === normal.id)!.matrix).toEqual({ row: 0, col: 0 });
  });

  it('回転したキーはキー中心を基準に並べ替えられる', () => {
    // 90° 回転した 2x1 キー: position (0,0) だが、幾何中心 (1,0.5) を軸に回すと
    // 実際の見た目は縦長になり、中心は変わらない (position だけでは行が乱れる例)。
    const rotated = createKey(
      { position: { x: 0, y: 0 }, size: { w: 2, h: 1 }, rotation: { angle: 90, origin: null } },
      deps,
    );
    const straight = createKey({ position: { x: 0, y: 2 }, size: { w: 1, h: 1 } }, deps);
    const project = projectWith([rotated, straight]);
    const result = autoAssignMatrix(project, null, { startRow: 0, startCol: 0 });
    // rotated の中心 (1, 0.5) の方が straight の中心 (0.5, 2.5) より上なので row 0。
    expect(result.keys.find((k) => k.id === rotated.id)!.matrix).toEqual({ row: 0, col: 0 });
    expect(result.keys.find((k) => k.id === straight.id)!.matrix).toEqual({ row: 1, col: 0 });
  });

  describe('並べ替えの安定性 (量子化)', () => {
    it('許容誤差の連鎖を作る Y 配置でも、何度実行しても同じ結果になる', () => {
      // A.y=0.00, B.y=0.09, C.y=0.18 は隣接差が 0.09 (許容誤差 0.1 未満) だが、
      // A と C の差は 0.18 (許容誤差を超える)。素朴な差分比較では推移律が
      // 崩れるため、バケット量子化を使う (docs/MATRIX.md#量子化を外してはいけない理由)。
      const a = createKey({ position: { x: 0, y: 0.0 } }, deps);
      const b = createKey({ position: { x: 1, y: 0.09 } }, deps);
      const c = createKey({ position: { x: 2, y: 0.18 } }, deps);
      const project = projectWith([a, b, c]);

      const results = Array.from({ length: 5 }, () => autoAssignMatrix(project, null, { startRow: 0, startCol: 0 }));
      for (const result of results) {
        expect(result).toEqual(results[0]);
      }

      // 行の区切りは「直前に新しい行として確定した Y」との差が rowTolerance を
      // 超えるかどうかで決まる (量子化はソートの安定性のためのもの)。
      // a(0.00) → 新しい行。b(0.09) は a との差 0.09 <= 0.1 なので同じ行。
      // c(0.18) は a との差 0.18 > 0.1 なので新しい行になる。
      const first = results[0]!;
      expect(first.keys.find((k) => k.id === a.id)!.matrix).toEqual({ row: 0, col: 0 });
      expect(first.keys.find((k) => k.id === b.id)!.matrix).toEqual({ row: 0, col: 1 });
      expect(first.keys.find((k) => k.id === c.id)!.matrix).toEqual({ row: 1, col: 0 });
    });
  });
});
