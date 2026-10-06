import { beforeEach, describe, expect, it } from 'vitest';
import { createKey } from '@/core/model/key';
import { createProject } from '@/core/model/project';
import { finishLegendEdit, pasteClipboard, copySelection, setZoomPercent, startLegendEdit } from '@/state/actions';
import { useEditorStore, useProjectStore } from '@/state/appState';

beforeEach(() => {
  useProjectStore.getState().loadProject({
    ...createProject('Test'),
    keys: [createKey({ id: 'a', legends: { topLeft: 'Q', bottomLeft: '1' } }), createKey({ id: 'b', position: { x: 1, y: 0 } })],
  });
  const editor = useEditorStore.getState();
  editor.clearSelection();
  editor.setEditingLegendKeyId(null);
  editor.setViewportPx({ width: 800, height: 600 });
  editor.setViewport(1, { x: 0, y: 0 });
});

const keyOf = (id: string) => useProjectStore.getState().project.keys.find((k) => k.id === id)!;

describe('刻印の直接編集', () => {
  it('startLegendEdit は対象キーだけを選択して編集状態にする', () => {
    useEditorStore.getState().selectKeys(['a', 'b']);
    startLegendEdit('b');
    expect(useEditorStore.getState().selectedKeyIds).toEqual(['b']);
    expect(useEditorStore.getState().editingLegendKeyId).toBe('b');
  });

  it('確定すると主刻印 (最初に値が入っているスロット) を書き換え、履歴 1 段になる', () => {
    startLegendEdit('a');
    finishLegendEdit('W');
    expect(keyOf('a').legends).toEqual({ topLeft: 'W', bottomLeft: '1' });
    expect(useEditorStore.getState().editingLegendKeyId).toBeNull();
    useProjectStore.getState().undo();
    expect(keyOf('a').legends.topLeft).toBe('Q');
  });

  it('刻印が無いキーは center に書く', () => {
    startLegendEdit('b');
    finishLegendEdit('Esc');
    expect(keyOf('b').legends).toEqual({ center: 'Esc' });
  });

  it('取り消し (null) と、内容が変わらない確定は履歴に積まない', () => {
    startLegendEdit('a');
    finishLegendEdit(null);
    startLegendEdit('a');
    finishLegendEdit('Q');
    expect(useProjectStore.getState().canUndo).toBe(false);
  });
});

describe('setZoomPercent', () => {
  it('% で倍率を指定し、範囲外は丸める', () => {
    setZoomPercent(150);
    expect(useEditorStore.getState().scale).toBe(1.5);
    setZoomPercent(10000);
    expect(useEditorStore.getState().scale).toBe(4);
  });

  it('不正な値は無視する', () => {
    setZoomPercent(Number.NaN);
    setZoomPercent(0);
    expect(useEditorStore.getState().scale).toBe(1);
  });
});

describe('コピー / 貼り付け', () => {
  it('グリッド幅だけずらして貼り付け、貼り付けたキーを選択する', () => {
    useEditorStore.getState().selectKeys(['a']);
    copySelection();
    pasteClipboard();
    const keys = useProjectStore.getState().project.keys;
    expect(keys).toHaveLength(3);
    const pasted = keys[2]!;
    const grid = useEditorStore.getState().gridSize;
    expect(pasted.position).toEqual({ x: grid, y: grid });
    expect(useEditorStore.getState().selectedKeyIds).toEqual([pasted.id]);
  });

  it('貼り付けたキーは元のキーと別の id になる (id が重複しない)', () => {
    useEditorStore.getState().selectKeys(['a']);
    copySelection();
    pasteClipboard();
    pasteClipboard();
    const ids = useProjectStore.getState().project.keys.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
