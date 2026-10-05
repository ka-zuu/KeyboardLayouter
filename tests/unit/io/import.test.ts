import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createKey } from '@/core/model/key';
import { createProject } from '@/core/model/project';
import { ImportError, parseImportText } from '@/io/import';
import { serializeProject } from '@/io/project/serialize';

const deps = { newId: () => 'new-id', now: () => 1700000000000 };

function fixture(path: string): string {
  return readFileSync(resolve(__dirname, '../../fixtures', path), 'utf8');
}

function expectImportError(text: string, messagePart: string): ImportError {
  try {
    parseImportText(text, deps);
  } catch (e) {
    expect(e).toBeInstanceOf(ImportError);
    expect((e as ImportError).message).toContain(messagePart);
    return e as ImportError;
  }
  throw new Error('ImportError が投げられなかった');
}

describe('parseImportText', () => {
  it('現行のプロジェクト JSON を読み込める', () => {
    const project = { ...createProject('KB', deps), keys: [createKey({ id: 'k1' }, deps)] };
    const text = serializeProject(project).files[0]!.content as string;

    const result = parseImportText(text, deps);

    expect(result.project.name).toBe('KB');
    expect(result.project.keys.map((k) => k.id)).toEqual(['k1']);
  });

  it('旧 MKD 形式は移行して読み込み、結果は移行のゴールデンファイルと一致する', () => {
    const result = parseImportText(fixture('project/v0/mkd-basic.json'), deps);
    const expected: unknown = JSON.parse(fixture('project/v1/mkd-basic.expected.json'));

    expect(result.project).toEqual(expected);
  });

  it('JSON として壊れていれば理由と対応形式を示す', () => {
    const error = expectImportError('{ "keys": [', 'JSON として解釈できませんでした');
    expect(error.details.join('\n')).toContain('対応形式');
  });

  it('KLE raw JSON は未対応である旨を示す (M3 まで)', () => {
    expectImportError('[["Esc", "Q"]]', 'KLE 形式の取込にはまだ対応していません');
  });

  it('判別できない形式は対応形式を並べる', () => {
    const error = expectImportError('{"foo": 1}', '判別できませんでした');
    expect(error.details[0]).toContain('プロジェクト JSON');
  });

  it('検証エラーは項目ごとに details に並べる', () => {
    const project = { ...createProject('KB', deps), keys: [createKey({ id: 'k1' }, deps)] };
    project.keys[0]!.size.w = 0;
    const error = expectImportError(JSON.stringify(project), '検証に失敗しました');
    expect(error.details).toContain('keys[0].size.w: size.w は正の数である必要があります。');
  });
});
