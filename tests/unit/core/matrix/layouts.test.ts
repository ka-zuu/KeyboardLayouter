import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { autoAssignMatrix } from '@/core/matrix/autoAssign';
import { validateMatrix } from '@/core/matrix/validate';
import { validateProject } from '@/core/model/validate';
import type { ProjectModel } from '@/core/model/types';

const LAYOUTS_DIR = join(import.meta.dirname, '../../../fixtures/layouts');

function readProject(name: string): ProjectModel {
  return JSON.parse(readFileSync(join(LAYOUTS_DIR, name), 'utf-8')) as ProjectModel;
}

describe('layouts フィクスチャ', () => {
  it('4x4-macropad.json は検証エラーが無く、マトリクスも整合している', () => {
    const project = readProject('4x4-macropad.json');
    expect(validateProject(project)).toEqual([]);
    const report = validateMatrix(project);
    expect(report.issues).toEqual([]);
    expect(report.estimatedRows).toBe(4);
    expect(report.estimatedCols).toBe(4);
  });

  it('split-ergo.json は検証エラーが無く、左右で side が分かれている', () => {
    const project = readProject('split-ergo.json');
    expect(validateProject(project)).toEqual([]);
    expect(project.meta.split).toBe(true);
    const leftIds = project.keys.filter((k) => k.side === 'left').map((k) => k.id);
    const rightIds = project.keys.filter((k) => k.side === 'right').map((k) => k.id);
    expect(leftIds.length).toBeGreaterThan(0);
    expect(rightIds.length).toBeGreaterThan(0);

    // 左右を独立に自動割り当てし直しても、互いのマトリクスに影響しない。
    const reassignedLeft = autoAssignMatrix(project, leftIds, { startRow: 0, startCol: 0 });
    const rightUnchanged = reassignedLeft.keys.filter((k) => k.side === 'right');
    const originalRight = project.keys.filter((k) => k.side === 'right');
    expect(rightUnchanged).toEqual(originalRight);
  });
});
