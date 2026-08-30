import { describe, expect, it, vi } from 'vitest';
import { createInMemoryStorageBackend, type StorageBackend } from '@/platform/storage/backend';
import { createAppStorage, DEFAULT_EDITOR_PREFS, type SaveStatus } from '@/platform/storage/appStorage';

function withRejectingSet(backend: StorageBackend): StorageBackend {
  return {
    ...backend,
    set: () => Promise.reject(new Error('boom')),
  };
}

describe('appStorage', () => {
  it('3 キー (projects / currentProjectId / editorPrefs) を往復できる', async () => {
    const primary = createInMemoryStorageBackend();
    const fallback = createInMemoryStorageBackend();
    const storage = createAppStorage({ primary, fallback, debounceMs: 5 });

    const projects = { p1: { id: 'p1' } as never };
    storage.saveProjects(projects);
    storage.saveCurrentProjectId('p1');
    storage.saveEditorPrefs(DEFAULT_EDITOR_PREFS);
    await storage.flush();

    await expect(storage.loadProjects()).resolves.toEqual(projects);
    await expect(storage.loadCurrentProjectId()).resolves.toBe('p1');
    await expect(storage.loadEditorPrefs()).resolves.toEqual(DEFAULT_EDITOR_PREFS);
  });

  it('デバウンス中に連続で書くと最後の値だけが primary に書かれる', async () => {
    vi.useFakeTimers();
    try {
      const primary = createInMemoryStorageBackend();
      const setSpy = vi.spyOn(primary, 'set');
      const fallback = createInMemoryStorageBackend();
      const storage = createAppStorage({ primary, fallback, debounceMs: 1000 });

      storage.saveCurrentProjectId('a');
      await vi.advanceTimersByTimeAsync(500);
      storage.saveCurrentProjectId('b');
      await vi.advanceTimersByTimeAsync(500);
      storage.saveCurrentProjectId('c');
      await vi.advanceTimersByTimeAsync(1000);

      expect(setSpy).toHaveBeenCalledTimes(1);
      expect(setSpy).toHaveBeenCalledWith('currentProjectId', 'c');
    } finally {
      vi.useRealTimers();
    }
  });

  it('primary への書き込みが失敗したら fallback へ書く', async () => {
    const primary = withRejectingSet(createInMemoryStorageBackend());
    const fallback = createInMemoryStorageBackend();
    const statuses: SaveStatus[] = [];
    const storage = createAppStorage({ primary, fallback, debounceMs: 5, onStatusChange: (s) => statuses.push(s) });

    storage.saveCurrentProjectId('x');
    await storage.flush();

    await expect(fallback.get('currentProjectId')).resolves.toBe('x');
    expect(statuses).toContain('saved');
    expect(statuses).not.toContain('failed');
  });

  it('primary / fallback ともに失敗すると failed を通知する', async () => {
    const primary = withRejectingSet(createInMemoryStorageBackend());
    const fallback = withRejectingSet(createInMemoryStorageBackend());
    const statuses: SaveStatus[] = [];
    const storage = createAppStorage({ primary, fallback, debounceMs: 5, onStatusChange: (s) => statuses.push(s) });

    storage.saveCurrentProjectId('x');
    await storage.flush();

    expect(statuses.at(-1)).toBe('failed');
  });

  it('primary に値が無いときは fallback から読む', async () => {
    const primary = createInMemoryStorageBackend();
    const fallback = createInMemoryStorageBackend();
    await fallback.set('currentProjectId', 'from-fallback');
    const storage = createAppStorage({ primary, fallback });

    await expect(storage.loadCurrentProjectId()).resolves.toBe('from-fallback');
  });
});
