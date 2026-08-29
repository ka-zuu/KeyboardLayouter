import { describe, expect, it } from 'vitest';
import { createEditorStore } from '@/state/editorStore';
import { MAX_SCALE, MIN_SCALE } from '@/core/geometry/viewport';

describe('editorStore', () => {
  it('selectKey (multi: false) は単一選択に置き換える', () => {
    const store = createEditorStore();
    store.getState().selectKey('a', false);
    store.getState().selectKey('b', false);
    expect(store.getState().selectedKeyIds).toEqual(['b']);
  });

  it('selectKey (multi: true) は選択への追加・除外をトグルする', () => {
    const store = createEditorStore();
    store.getState().selectKey('a', true);
    store.getState().selectKey('b', true);
    expect(store.getState().selectedKeyIds).toEqual(['a', 'b']);

    store.getState().selectKey('a', true);
    expect(store.getState().selectedKeyIds).toEqual(['b']);
  });

  it('selectKeys / clearSelection', () => {
    const store = createEditorStore();
    store.getState().selectKeys(['a', 'b', 'c']);
    expect(store.getState().selectedKeyIds).toEqual(['a', 'b', 'c']);
    store.getState().clearSelection();
    expect(store.getState().selectedKeyIds).toEqual([]);
  });

  it('setScale は範囲 (0.2〜4.0) にクランプする', () => {
    const store = createEditorStore();
    store.getState().setScale(0);
    expect(store.getState().scale).toBe(MIN_SCALE);
    store.getState().setScale(100);
    expect(store.getState().scale).toBe(MAX_SCALE);
    store.getState().setScale(2);
    expect(store.getState().scale).toBe(2);
  });

  it('activeTool の切り替え', () => {
    const store = createEditorStore();
    expect(store.getState().activeTool).toBe('select');
    store.getState().setActiveTool('rotate');
    expect(store.getState().activeTool).toBe('rotate');
  });

  it('toggleSnap / toggleShowMatrix / toggleLeftPanel はブール値を反転する', () => {
    const store = createEditorStore();
    const before = store.getState().snapEnabled;
    store.getState().toggleSnap();
    expect(store.getState().snapEnabled).toBe(!before);

    expect(store.getState().showMatrix).toBe(false);
    store.getState().toggleShowMatrix();
    expect(store.getState().showMatrix).toBe(true);

    expect(store.getState().leftPanelCollapsed).toBe(false);
    store.getState().toggleLeftPanel();
    expect(store.getState().leftPanelCollapsed).toBe(true);
  });
});
