import { describe, expect, it } from 'vitest';
import { createProjectStore } from '@/state/projectStore';
import { createProject } from '@/core/model/project';
import { createKey } from '@/core/model/key';
import type { ProjectModel } from '@/core/model/types';

let seq = 0;
const deps = { newId: () => `id-${(seq++).toString()}`, now: () => 1700000000000 };

function projectWith(keys: ReturnType<typeof createKey>[] = []): ProjectModel {
  return { ...createProject('Test', deps), keys };
}

describe('projectStore', () => {
  it('addKeys は core/commands/addKeys を通り、履歴が 1 段積まれる', () => {
    const store = createProjectStore(projectWith(), deps);
    expect(store.getState().canUndo).toBe(false);

    store.getState().addKeys([{ position: { x: 0, y: 0 } }]);

    expect(store.getState().project.keys).toHaveLength(1);
    expect(store.getState().canUndo).toBe(true);
    expect(store.getState().undoLabel).toBe('キーの追加');
  });

  it('moveKeys → undo で元の位置に戻る', () => {
    const key = createKey({ position: { x: 0, y: 0 } }, deps);
    const store = createProjectStore(projectWith([key]), deps);

    store.getState().moveKeys([key.id], { x: 1, y: 1 });
    expect(store.getState().project.keys[0]!.position).toEqual({ x: 1, y: 1 });

    store.getState().undo();
    expect(store.getState().project.keys[0]!.position).toEqual({ x: 0, y: 0 });
    expect(store.getState().canUndo).toBe(false);
    expect(store.getState().canRedo).toBe(true);
  });

  it('undo 後の redo で再適用できる', () => {
    const key = createKey({ position: { x: 0, y: 0 } }, deps);
    const store = createProjectStore(projectWith([key]), deps);

    store.getState().moveKeys([key.id], { x: 2, y: 0 });
    store.getState().undo();
    store.getState().redo();

    expect(store.getState().project.keys[0]!.position).toEqual({ x: 2, y: 0 });
    expect(store.getState().canRedo).toBe(false);
  });

  it('同じ coalesceKey の連続 moveKeys は履歴 1 段になる (ドラッグ相当)', () => {
    const key = createKey({ position: { x: 0, y: 0 } }, deps);
    const store = createProjectStore(projectWith([key]), deps);

    store.getState().moveKeys([key.id], { x: 1, y: 0 }, 'drag-1');
    store.getState().moveKeys([key.id], { x: 1, y: 0 }, 'drag-1');
    store.getState().moveKeys([key.id], { x: 1, y: 0 }, 'drag-1');

    expect(store.getState().project.keys[0]!.position).toEqual({ x: 3, y: 0 });

    store.getState().undo();
    expect(store.getState().project.keys[0]!.position).toEqual({ x: 0, y: 0 });
    expect(store.getState().canUndo).toBe(false);
  });

  it('変化の無い操作は履歴を積まない', () => {
    const store = createProjectStore(projectWith(), deps);
    store.getState().deleteKeys(['does-not-exist']);
    expect(store.getState().canUndo).toBe(false);
  });

  it('loadProject は履歴をリセットする', () => {
    const key = createKey({ position: { x: 0, y: 0 } }, deps);
    const store = createProjectStore(projectWith([key]), deps);
    store.getState().moveKeys([key.id], { x: 1, y: 0 });
    expect(store.getState().canUndo).toBe(true);

    store.getState().loadProject(projectWith());
    expect(store.getState().canUndo).toBe(false);
    expect(store.getState().project.keys).toHaveLength(0);
  });

  it('duplicateKeys / rotateKeys / alignKeys / autoAssignMatrix も core/commands 経由で反映される', () => {
    const k1 = createKey({ position: { x: 0, y: 0 } }, deps);
    const k2 = createKey({ position: { x: 1, y: 0.05 } }, deps);
    const store = createProjectStore(projectWith([k1, k2]), deps);

    store.getState().duplicateKeys([k1.id], { x: 1, y: 0 });
    expect(store.getState().project.keys).toHaveLength(3);

    store.getState().rotateKeys([k1.id], 90);
    expect(store.getState().project.keys.find((k) => k.id === k1.id)!.rotation.angle).toBe(90);

    store.getState().autoAssignMatrix(null, { startRow: 0, startCol: 0 });
    expect(store.getState().project.keys.every((k) => k.matrix !== null)).toBe(true);
  });
});
