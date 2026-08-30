import { describe, expect, it } from 'vitest';
import { createHistory, HISTORY_LIMIT } from '@/state/history';
import { createProject } from '@/core/model/project';
import type { ProjectModel } from '@/core/model/types';

let seq = 0;
const deps = { newId: () => `id-${(seq++).toString()}`, now: () => 1700000000000 };

function projectNamed(name: string): ProjectModel {
  return createProject(name, deps);
}

describe('createHistory', () => {
  it('初期状態では undo/redo できない', () => {
    const history = createHistory(projectNamed('A'));
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.undoLabel).toBeNull();
    expect(history.redoLabel).toBeNull();
  });

  it('push した後は undo でき、undoLabel はその操作名になる', () => {
    const history = createHistory(projectNamed('A'));
    history.push({ project: projectNamed('B'), label: 'キーの移動', coalesceKey: null });

    expect(history.canUndo).toBe(true);
    expect(history.undoLabel).toBe('キーの移動');

    const entry = history.undo();
    expect(entry?.project.name).toBe('A');
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);
    expect(history.redoLabel).toBe('キーの移動');
  });

  it('undo 後に redo すると元に戻る', () => {
    const history = createHistory(projectNamed('A'));
    history.push({ project: projectNamed('B'), label: 'キーの移動', coalesceKey: null });
    history.undo();
    const entry = history.redo();
    expect(entry?.project.name).toBe('B');
    expect(history.canRedo).toBe(false);
  });

  it('undo 後に新しい push をすると redo が捨てられる', () => {
    const history = createHistory(projectNamed('A'));
    history.push({ project: projectNamed('B'), label: '操作1', coalesceKey: null });
    history.undo();
    history.push({ project: projectNamed('C'), label: '操作2', coalesceKey: null });

    expect(history.canRedo).toBe(false);
    expect(history.redo()).toBeNull();
    const entry = history.undo();
    expect(entry?.project.name).toBe('A');
  });

  it('同じ coalesceKey の連続 push は 1 段にまとまる (ドラッグ中の更新)', () => {
    const history = createHistory(projectNamed('A'));
    history.push({ project: projectNamed('B1'), label: 'キーの移動', coalesceKey: 'drag-1' });
    history.push({ project: projectNamed('B2'), label: 'キーの移動', coalesceKey: 'drag-1' });
    history.push({ project: projectNamed('B3'), label: 'キーの移動', coalesceKey: 'drag-1' });

    expect(history.canUndo).toBe(true);
    const entry = history.undo();
    expect(entry?.project.name).toBe('A');
    expect(history.canUndo).toBe(false);
  });

  it('coalesceKey が異なれば別の段になる', () => {
    const history = createHistory(projectNamed('A'));
    history.push({ project: projectNamed('B'), label: '操作1', coalesceKey: 'drag-1' });
    history.push({ project: projectNamed('C'), label: '操作2', coalesceKey: 'drag-2' });

    history.undo();
    expect(history.undoLabel).toBe('操作1');
  });

  it('coalesceKey が null 同士は結合しない', () => {
    const history = createHistory(projectNamed('A'));
    history.push({ project: projectNamed('B'), label: '操作1', coalesceKey: null });
    history.push({ project: projectNamed('C'), label: '操作2', coalesceKey: null });

    history.undo();
    expect(history.undoLabel).toBe('操作1');
  });

  it(`上限 (${HISTORY_LIMIT.toString()} 段) を超えると古い履歴が捨てられる`, () => {
    const history = createHistory(projectNamed('initial'));
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
      history.push({ project: projectNamed(`step-${i.toString()}`), label: `操作${i.toString()}`, coalesceKey: null });
    }

    let undoCount = 0;
    while (history.canUndo) {
      history.undo();
      undoCount += 1;
    }
    expect(undoCount).toBe(HISTORY_LIMIT);
  });
});
