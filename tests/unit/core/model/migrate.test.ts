import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { migrate } from '@/core/model/migrate';

const FIXTURES_DIR = join(import.meta.dirname, '../../../fixtures/project');
const V0_DIR = join(FIXTURES_DIR, 'v0');
const V1_DIR = join(FIXTURES_DIR, 'v1');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

const fixtureNames = readdirSync(V0_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''));

describe('migrate (v0 -> v1)', () => {
  it('旧 MKD 形式のフィクスチャが 8 件揃っている', () => {
    expect(fixtureNames.sort()).toEqual(
      [
        'mkd-basic',
        'mkd-iso-enter',
        'mkd-stepped',
        'mkd-rotated',
        'mkd-legacy-visual-legend',
        'mkd-legacy-tlbr',
        'mkd-all-zero-matrix',
        'mkd-with-selected',
      ].sort(),
    );
  });

  it.each(fixtureNames)('%s がゴールデンファイルと一致する', (name) => {
    const raw = readJson(join(V0_DIR, `${name}.json`));
    const expectedProject = readJson(join(V1_DIR, `${name}.expected.json`));
    const expectedWarnings = readJson(join(V1_DIR, `${name}.expected.warnings.json`));

    const { project, warnings } = migrate(raw);

    expect(project).toEqual(expectedProject);
    expect(warnings).toEqual(expectedWarnings);
  });

  it('isSelected は破棄され、結果のキーに含まれない', () => {
    const raw = readJson(join(V0_DIR, 'mkd-with-selected.json'));
    const { project } = migrate(raw);
    expect(project.keys[0]).not.toHaveProperty('isSelected');
  });

  it('schemaVersion が現在より新しい場合は読み込みを拒否する', () => {
    expect(() => migrate({ schemaVersion: 999, keys: [] })).toThrow(/版 999/);
  });

  it('schemaVersion が現在と同じ場合はそのまま返す (移行しない)', () => {
    const raw = readJson(join(V1_DIR, 'mkd-basic.expected.json'));
    const { project, warnings } = migrate(raw);
    expect(project).toEqual(raw);
    expect(warnings).toEqual([]);
  });
});
