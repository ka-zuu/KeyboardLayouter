import { describe, expect, it } from 'vitest';
import { buildCommands } from '@/ui/command/commands';
import { bestFuzzyScore, fuzzyScore, normalizeForSearch, rankItems } from '@/ui/command/fuzzy';
import { formatShortcut, SHORTCUT_SECTIONS } from '@/ui/command/shortcuts';

describe('normalizeForSearch', () => {
  it('カタカナ・半角カナ・全角英字・大文字を同じ形に揃える', () => {
    expect(normalizeForSearch('セイレツ')).toBe('せいれつ');
    expect(normalizeForSearch('ｾｲﾚﾂ')).toBe('せいれつ');
    expect(normalizeForSearch('ＡＬＩＧＮ')).toBe('align');
  });
});

describe('fuzzyScore', () => {
  it('部分列として含まれれば一致、順番が違えば不一致', () => {
    expect(fuzzyScore('alg', 'align left')).not.toBeNull();
    expect(fuzzyScore('gla', 'align left')).toBeNull();
  });

  it('連続一致・前方一致のほうが高い', () => {
    expect(fuzzyScore('ali', 'align left')!).toBeGreaterThan(fuzzyScore('ali', 'a lot of items')!);
    expect(fuzzyScore('zoom', 'zoom in')!).toBeGreaterThan(fuzzyScore('zoom', 'fit all zoom')!);
  });

  it('空クエリは常に一致', () => {
    expect(bestFuzzyScore('', ['anything'])).toBe(0);
  });
});

describe('rankItems', () => {
  const items = [
    { id: 'a', title: '左揃え', keywords: ['align left', 'せいれつ'] },
    { id: 'b', title: '右揃え', keywords: ['align right', 'せいれつ'] },
    { id: 'c', title: '拡大', keywords: ['zoom in'] },
  ];

  it('クエリが空なら最近使った操作が先頭、残りは定義順', () => {
    expect(rankItems(items, '', ['c']).map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });

  it('一致しないものは除外する', () => {
    expect(rankItems(items, 'zoom', []).map((i) => i.id)).toEqual(['c']);
  });

  it('同点なら最近使ったほうが上に来る', () => {
    expect(rankItems(items, 'せいれつ', []).map((i) => i.id)).toEqual(['a', 'b']);
    expect(rankItems(items, 'せいれつ', ['b']).map((i) => i.id)).toEqual(['b', 'a']);
  });
});

describe('コマンド定義', () => {
  const commands = buildCommands();

  it('id が重複しない', () => {
    expect(new Set(commands.map((c) => c.id)).size).toBe(commands.length);
  });

  it('日本語の読みと英語の両方で引ける (docs/UI_SPEC.md#コマンドパレット-cmdctrlk の例)', () => {
    const byReading = rankItems(commands, 'せいれつ', []).map((c) => c.id);
    const byEnglish = rankItems(commands, 'align', []).map((c) => c.id);
    for (const id of ['align.left', 'align.right', 'align.top', 'align.bottom']) {
      expect(byReading).toContain(id);
      expect(byEnglish).toContain(id);
    }
    expect(rankItems(commands, 'セイレツ', [])[0]?.group).toBe('整列');
  });

  it('併記するショートカットはすべてショートカット一覧 (?) に載っている', () => {
    const listed = new Set(SHORTCUT_SECTIONS.flatMap((section) => section.entries.flatMap((entry) => entry.keys.split(' / '))));
    for (const command of commands) {
      if (command.shortcut) expect(listed, `${command.id} の ${command.shortcut}`).toContain(command.shortcut);
    }
  });
});

describe('formatShortcut', () => {
  it('Mod を環境に合わせて書き換える', () => {
    expect(formatShortcut('Mod+Shift+Z / Ctrl+Y', false)).toBe('Ctrl+Shift+Z / Ctrl+Y');
    expect(formatShortcut('Mod+Alt+\\', true)).toBe('Cmd+Option+\\');
    expect(formatShortcut('?', true)).toBe('?');
  });
});
