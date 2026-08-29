import { describe, expect, it } from 'vitest';
import { createKey } from '@/core/model/key';
import { createProject } from '@/core/model/project';
import { repairProject, validateProject } from '@/core/model/validate';

const deps = { newId: () => 'new-id', now: () => 1700000000000 };

function baseProject() {
  const project = createProject('Test', deps);
  return { ...project, keys: [createKey({ id: 'k1' }, deps)] };
}

describe('validateProject', () => {
  it('正常なプロジェクトはエラーも警告も出さない', () => {
    expect(validateProject(baseProject())).toEqual([]);
  });

  it('オブジェクトでない値はエラー', () => {
    expect(validateProject(null)).toEqual([{ path: '', message: expect.any(String), severity: 'error' }]);
  });

  it('size.w <= 0 はエラー', () => {
    const project = baseProject();
    project.keys[0]!.size.w = 0;
    const issues = validateProject(project);
    expect(issues).toContainEqual(expect.objectContaining({ path: 'keys[0].size.w', severity: 'error' }));
  });

  it('id の重複は警告 (エラーにしない)', () => {
    const project = baseProject();
    project.keys.push(createKey({ id: 'k1' }, deps));
    const issues = validateProject(project);
    expect(issues).toContainEqual(expect.objectContaining({ path: 'keys[1].id', severity: 'warning' }));
    expect(issues.some((i) => i.severity === 'error')).toBe(false);
  });

  it("shape が 'rect' なのに secondary があるのは警告", () => {
    const project = baseProject();
    project.keys[0]!.secondary = { x: 0, y: 0, w: 1, h: 1 };
    const issues = validateProject(project);
    expect(issues).toContainEqual(expect.objectContaining({ path: 'keys[0].shape', severity: 'warning' }));
  });

  it("shape が 'custom' で polygon が 3 点未満のときは警告", () => {
    const project = baseProject();
    project.keys[0]!.shape = 'custom';
    project.keys[0]!.polygon = [{ x: 0, y: 0 }];
    const issues = validateProject(project);
    expect(issues).toContainEqual(expect.objectContaining({ path: 'keys[0].polygon', severity: 'warning' }));
  });

  it('NaN / Infinity はエラー', () => {
    const project = baseProject();
    project.keys[0]!.position.x = Number.NaN;
    const issues = validateProject(project);
    expect(issues).toContainEqual(expect.objectContaining({ path: 'keys[0].position.x', severity: 'error' }));
  });
});

describe('repairProject', () => {
  it('重複した id には新しい id を振る', () => {
    const project = baseProject();
    project.keys.push(createKey({ id: 'k1' }, deps));
    const { project: repaired, warnings } = repairProject(project, deps);
    expect(repaired.keys[0]!.id).toBe('k1');
    expect(repaired.keys[1]!.id).toBe('new-id');
    expect(warnings).toHaveLength(1);
  });

  it("不整合な shape は 'rect' に統一する", () => {
    const project = baseProject();
    project.keys[0]!.shape = 'isoEnter';
    project.keys[0]!.secondary = null;
    const { project: repaired } = repairProject(project, deps);
    expect(repaired.keys[0]!.shape).toBe('rect');
    expect(repaired.keys[0]!.secondary).toBeNull();
  });

  it('問題が無ければ何も変えない', () => {
    const project = baseProject();
    const { project: repaired, warnings } = repairProject(project, deps);
    expect(repaired).toEqual(project);
    expect(warnings).toEqual([]);
  });
});
