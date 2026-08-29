import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createInMemoryStorageBackend } from '@/platform/storage/backend';
import { findLegacyRawData, importLegacyProjects, LEGACY_STORAGE_KEY } from '@/platform/storage/legacyImport';

let seq = 0;
const deps = { newId: () => `id-${(seq++).toString()}`, now: () => 1700000000000 };

function loadFixture(name: string): unknown {
  const path = new URL(`../../../fixtures/project/v0/${name}`, import.meta.url);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

describe('legacyImport', () => {
  it('IndexedDB に旧データがあれば localStorage より優先して読む', async () => {
    const indexedDb = createInMemoryStorageBackend();
    const localStorage = createInMemoryStorageBackend();
    await indexedDb.set(LEGACY_STORAGE_KEY, { state: { project: { id: 'from-idb' } } });
    await localStorage.set(LEGACY_STORAGE_KEY, { state: { project: { id: 'from-local' } } });

    const raw = await findLegacyRawData({ indexedDb, localStorage });
    expect(raw).toEqual({ state: { project: { id: 'from-idb' } } });
  });

  it('旧データが無ければ undefined', async () => {
    const indexedDb = createInMemoryStorageBackend();
    const localStorage = createInMemoryStorageBackend();
    await expect(importLegacyProjects({ indexedDb, localStorage }, deps)).resolves.toBeUndefined();
  });

  it('zustand persist の state.project / state.savedProjects を展開して移行する (重複は除く)', async () => {
    const basic = loadFixture('mkd-basic.json') as { id: string };
    const rotated = loadFixture('mkd-rotated.json') as { id: string };
    const indexedDb = createInMemoryStorageBackend();
    await indexedDb.set(LEGACY_STORAGE_KEY, {
      state: {
        project: basic, // 現在開いているプロジェクト
        savedProjects: { [basic.id]: basic, [rotated.id]: rotated },
      },
      version: 0,
    });
    const localStorage = createInMemoryStorageBackend();

    const result = await importLegacyProjects({ indexedDb, localStorage }, deps);
    expect(result).toBeDefined();
    const ids = result!.map((r) => r.project.id).sort();
    expect(ids).toEqual([basic.id, rotated.id].sort());
    expect(result!.every((r) => r.project.schemaVersion === 1)).toBe(true);
  });

  it('取り込んでも旧データは削除されない', async () => {
    const basic = loadFixture('mkd-basic.json');
    const indexedDb = createInMemoryStorageBackend();
    const stored = { state: { project: basic, savedProjects: {} } };
    await indexedDb.set(LEGACY_STORAGE_KEY, stored);
    const localStorage = createInMemoryStorageBackend();

    await importLegacyProjects({ indexedDb, localStorage }, deps);

    await expect(indexedDb.get(LEGACY_STORAGE_KEY)).resolves.toEqual(stored);
  });

  it('警告 (副矩形の補完等) が伝播する', async () => {
    const iso = loadFixture('mkd-iso-enter.json');
    const indexedDb = createInMemoryStorageBackend();
    await indexedDb.set(LEGACY_STORAGE_KEY, { state: { project: iso, savedProjects: {} } });
    const localStorage = createInMemoryStorageBackend();

    const result = await importLegacyProjects({ indexedDb, localStorage }, deps);
    expect(result![0]!.warnings.some((w) => w.code === 'secondary-rect-inferred')).toBe(true);
  });
});
