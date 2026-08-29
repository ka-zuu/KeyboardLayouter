import { describe, expect, it } from 'vitest';
import { validateMatrix } from '@/core/matrix/validate';
import { createKey } from '@/core/model/key';
import { createProject } from '@/core/model/project';
import type { ProjectModel } from '@/core/model/types';

const deps = { newId: () => `id-${Math.random().toString(36).slice(2)}`, now: () => 1700000000000 };

function projectWith(keys: ReturnType<typeof createKey>[]): ProjectModel {
  return { ...createProject('Test', deps), keys };
}

describe('validateMatrix', () => {
  it('重複を検出する', () => {
    const a = createKey({ matrix: { row: 0, col: 0 } }, deps);
    const b = createKey({ matrix: { row: 0, col: 0 } }, deps);
    const report = validateMatrix(projectWith([a, b]));
    expect(report.issues.some((i) => i.code === 'duplicate' && i.keyIds.includes(a.id) && i.keyIds.includes(b.id))).toBe(true);
  });

  it('未割り当てを検出する (decal は除く)', () => {
    const unassigned = createKey({ matrix: null }, deps);
    const decal = createKey({ matrix: null, decal: true }, deps);
    const report = validateMatrix(projectWith([unassigned, decal]));
    const issue = report.issues.find((i) => i.code === 'unassigned');
    expect(issue?.keyIds).toEqual([unassigned.id]);
  });

  it('欠番を検出する', () => {
    const a = createKey({ matrix: { row: 0, col: 0 } }, deps);
    const b = createKey({ matrix: { row: 2, col: 0 } }, deps);
    const report = validateMatrix(projectWith([a, b]));
    expect(report.issues.some((i) => i.code === 'row-gap')).toBe(true);
  });

  it('推定サイズを最大 Row/Col + 1 で返す', () => {
    const a = createKey({ matrix: { row: 3, col: 5 } }, deps);
    const report = validateMatrix(projectWith([a]));
    expect(report.estimatedRows).toBe(4);
    expect(report.estimatedCols).toBe(6);
  });

  it('問題が無ければ issues は空', () => {
    const a = createKey({ matrix: { row: 0, col: 0 } }, deps);
    const b = createKey({ matrix: { row: 0, col: 1 } }, deps);
    const report = validateMatrix(projectWith([a, b]));
    expect(report.issues).toEqual([]);
  });
});
