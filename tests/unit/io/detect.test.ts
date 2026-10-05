import { describe, expect, it } from 'vitest';
import { detectFormat } from '@/io/detect';

// docs/formats/README.md#入力の判別 の表の各行。
describe('detectFormat', () => {
  it('schemaVersion を持つオブジェクトはプロジェクト JSON', () => {
    expect(detectFormat({ schemaVersion: 1, keys: [] })).toBe('project');
  });

  it('keys 配列を持ち schemaVersion が無いオブジェクトは旧 MKD', () => {
    expect(detectFormat({ id: 'x', keys: [] })).toBe('legacy-mkd');
  });

  it('要素が配列の配列は KLE raw JSON', () => {
    expect(detectFormat([['Esc', 'Q'], ['A']])).toBe('kle');
  });

  it('先頭だけオブジェクト (メタ情報) の配列も KLE raw JSON', () => {
    expect(detectFormat([{ name: 'kb' }, ['Esc']])).toBe('kle');
  });

  it('layouts を持つオブジェクトは KLE の kbd.json', () => {
    expect(detectFormat({ meta: {}, layouts: {} })).toBe('kle-kbd');
  });

  it('判別できないものは unknown', () => {
    expect(detectFormat(null)).toBe('unknown');
    expect(detectFormat(42)).toBe('unknown');
    expect(detectFormat('text')).toBe('unknown');
    expect(detectFormat([])).toBe('unknown');
    expect(detectFormat([['a'], { notFirst: true }])).toBe('unknown');
    expect(detectFormat({ foo: 1 })).toBe('unknown');
  });
});
