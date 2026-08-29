import { describe, expect, it } from 'vitest';
import { createKey } from '@/core/model/key';
import { createProject } from '@/core/model/project';
import type { ProjectModel } from '@/core/model/types';
import { parseProject, ProjectFormatError, ProjectValidationError } from '@/io/project/parse';
import { projectFileName, serializeProject } from '@/io/project/serialize';

const deps = { newId: () => 'new-id', now: () => 1700000000000 };

function sampleProject(): ProjectModel {
  const project = createProject('My Keyboard', deps);
  return {
    ...project,
    keys: [
      createKey({ id: 'k1', position: { x: 3, y: 2 }, legends: { topCenter: 'Esc' }, matrix: { row: 0, col: 0 } }, deps),
      createKey({ id: 'k2', position: { x: 4, y: 2 }, legends: { topCenter: 'Q' }, matrix: { row: 0, col: 1 } }, deps),
    ],
  };
}

describe('プロジェクト JSON の往復', () => {
  it('serialize → parse で updatedAt を除いて完全一致する (normalize: false)', () => {
    const project = sampleProject();
    const { files } = serializeProject(project, { normalize: false });
    const { project: parsed, warnings } = parseProject(files[0]!.content as string, deps);

    expect(warnings).toEqual([]);
    const { updatedAt: _u1, ...rest } = project;
    const { updatedAt: _u2, ...parsedRest } = parsed;
    void _u1;
    void _u2;
    expect(parsedRest).toEqual(rest);
  });

  it('正規化すると全キーの AABB 左上が原点になる', () => {
    const project = sampleProject(); // 最小 x=3
    const { files } = serializeProject(project, { normalize: true });
    const { project: parsed } = parseProject(files[0]!.content as string, deps);
    const minX = Math.min(...parsed.keys.map((k) => k.position.x));
    const minY = Math.min(...parsed.keys.map((k) => k.position.y));
    expect(minX).toBe(0);
    expect(minY).toBe(0);
  });

  it('出力は 2 スペース indent, LF, 末尾に改行 1 つ', () => {
    const { files } = serializeProject(sampleProject());
    const content = files[0]!.content as string;
    expect(content.includes('\r')).toBe(false);
    expect(content.endsWith('\n')).toBe(true);
    expect(content.endsWith('\n\n')).toBe(false);
    expect(content).toContain('\n  "schemaVersion"');
  });

  it('キーは Row → Col の順に並び替えて出力する', () => {
    const project = sampleProject();
    // 意図的に元の配列順を逆にしてみる。
    project.keys.reverse();
    const { files } = serializeProject(project, { normalize: false });
    const { project: parsed } = parseProject(files[0]!.content as string, deps);
    expect(parsed.keys.map((k) => k.id)).toEqual(['k1', 'k2']);
  });

  it('プロジェクト名の空白をアンダースコアに置換したファイル名になる', () => {
    expect(projectFileName({ name: 'My Cool  Keyboard' })).toBe('My_Cool_Keyboard.json');
  });
});

describe('parseProject: 形式判別とエラー', () => {
  it('keys 配列を持たない値は ProjectFormatError', () => {
    expect(() => parseProject({ foo: 'bar' })).toThrow(ProjectFormatError);
  });

  it('壊れた JSON 文字列は ProjectFormatError', () => {
    expect(() => parseProject('{not json')).toThrow(ProjectFormatError);
  });

  it('size.w <= 0 のような構造的エラーは読み込みを中止する', () => {
    const project = sampleProject();
    project.keys[0]!.size.w = 0;
    expect(() => parseProject(project)).toThrow(ProjectValidationError);
  });

  it('schemaVersion が無い旧 MKD 形式は migrate を経由して読み込める', () => {
    const legacy = {
      id: 'legacy-1',
      name: 'Legacy',
      keys: [
        {
          id: 'k1',
          position: { x: 0, y: 0 },
          size: { w: 1, h: 1 },
          angle: 0,
          rotationCenter: { x: 0, y: 0 },
          legends: { top: 'A', bottom: '', left: '', right: '' },
          matrix: { row: 0, col: 0 },
        },
      ],
      createdAt: 1,
      updatedAt: 1,
    };
    const { project, warnings } = parseProject(legacy, deps);
    expect(project.schemaVersion).toBe(1);
    expect(project.keys[0]!.legends).toEqual({ topCenter: 'A' });
    expect(warnings).toEqual([]);
  });
});
