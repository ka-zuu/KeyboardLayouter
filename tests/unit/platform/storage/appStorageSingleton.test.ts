import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProject } from '@/core/model/project';
import { forgetProject, getProjectsCache, onProjectsChange, rememberProject, setProjectsCache } from '@/platform/storage/appStorageSingleton';

let seq = 0;
const deps = { newId: () => `p-${(seq++).toString()}`, now: () => 1700000000000 };

describe('appStorageSingleton のプロジェクト一覧キャッシュ', () => {
  beforeEach(() => {
    setProjectsCache({});
  });

  it('onProjectsChange は登録直後に現在の内容で呼ばれ、remember / forget のたびに通知される', () => {
    const listener = vi.fn();
    const unsubscribe = onProjectsChange(listener);
    expect(listener).toHaveBeenLastCalledWith({});

    const a = createProject('A', deps);
    rememberProject(a);
    expect(listener).toHaveBeenLastCalledWith({ [a.id]: a });

    forgetProject(a.id);
    expect(listener).toHaveBeenLastCalledWith({});
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    rememberProject(a);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('同じオブジェクトの remember と、存在しない id の forget は通知しない', () => {
    const a = createProject('A', deps);
    rememberProject(a);
    const listener = vi.fn();
    onProjectsChange(listener);
    listener.mockClear();

    rememberProject(a);
    forgetProject('missing');
    expect(listener).not.toHaveBeenCalled();
  });

  it('forgetProject は他のプロジェクトを残す', () => {
    const a = createProject('A', deps);
    const b = createProject('B', deps);
    rememberProject(a);
    rememberProject(b);

    const remaining = forgetProject(a.id);
    expect(Object.keys(remaining)).toEqual([b.id]);
    expect(getProjectsCache()).toBe(remaining);
  });
});
