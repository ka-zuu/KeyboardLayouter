/**
 * 旧アプリ (MKD) がブラウザに残したデータの取り込み。
 * docs/MIGRATION_FROM_MKD.md#ブラウザに残ったデータの取り込み と 1 対 1。
 *
 * 旧アプリは Zustand の `persist` ミドルウェアでこの形を保存していた
 * (`legacy/v1` の `store/useStore.ts` の `partialize`):
 *
 * ```
 * { state: { project: LegacyProjectData, savedProjects: Record<string, LegacyProjectData> }, version: number }
 * ```
 *
 * `migrate()` は「1 個のレガシープロジェクト」を受け取る関数なので、
 * ここで `project` と `savedProjects` を展開してから 1 件ずつ渡す。
 *
 * **旧データは削除しない。** 取り込みに失敗したときに戻れるようにするため
 * (docs/MIGRATION_FROM_MKD.md の「見つかった場合の挙動」)。
 */
import { defaultDeps, type ModelDeps } from '@/core/model/deps';
import { migrate, type MigrationWarning } from '@/core/model/migrate';
import type { ProjectModel } from '@/core/model/types';
import { createIndexedDBBackend } from './idb';
import { createLocalStorageBackend } from './backend';
import type { StorageBackend } from './backend';

/** 旧アプリの IndexedDB データベース名・ストア名・キー名 (固定値)。 */
export const LEGACY_DB_NAME = 'mkd-db';
export const LEGACY_STORE_NAME = 'keyval';
export const LEGACY_STORAGE_KEY = 'mkd-storage';

interface LegacyPersistValue {
  state?: {
    project?: unknown;
    savedProjects?: Record<string, unknown>;
  };
  // ラップされていない場合 (直接 state 相当が保存されている場合) への保険。
  project?: unknown;
  savedProjects?: Record<string, unknown>;
}

export interface LegacyImportedProject {
  project: ProjectModel;
  warnings: MigrationWarning[];
}

export interface LegacyImportSources {
  indexedDb?: StorageBackend;
  localStorage?: StorageBackend;
}

function defaultSources(): LegacyImportSources {
  return {
    indexedDb: createIndexedDBBackend(LEGACY_DB_NAME, LEGACY_STORE_NAME),
    localStorage: createLocalStorageBackend(),
  };
}

/**
 * 旧データの生の値を探す。IndexedDB → localStorage の順に見る。
 * 見つからなければ `undefined`。
 */
export async function findLegacyRawData(sources: LegacyImportSources = defaultSources()): Promise<unknown | undefined> {
  const fromIdb = await sources.indexedDb?.get<unknown>(LEGACY_STORAGE_KEY);
  if (fromIdb !== undefined) return fromIdb;
  return sources.localStorage?.get<unknown>(LEGACY_STORAGE_KEY);
}

function collectLegacyProjects(raw: unknown): unknown[] {
  if (raw === null || typeof raw !== 'object') return [];
  const value = raw as LegacyPersistValue;
  const state = value.state ?? value;

  const projects: unknown[] = [];
  const seenIds = new Set<string>();

  const savedProjects = (state as { savedProjects?: Record<string, unknown> }).savedProjects;
  if (savedProjects && typeof savedProjects === 'object') {
    for (const p of Object.values(savedProjects)) {
      const id = (p as { id?: unknown } | null)?.id;
      if (typeof id === 'string') seenIds.add(id);
      projects.push(p);
    }
  }

  const current = (state as { project?: unknown }).project;
  if (current && typeof current === 'object') {
    const id = (current as { id?: unknown }).id;
    if (typeof id !== 'string' || !seenIds.has(id)) {
      projects.push(current);
    }
  }

  return projects;
}

/**
 * 旧データを探し、見つかったすべてのプロジェクトを現行モデルへ移行する。
 * データが無ければ `undefined`。
 */
export async function importLegacyProjects(
  sources: LegacyImportSources = defaultSources(),
  deps: ModelDeps = defaultDeps,
): Promise<LegacyImportedProject[] | undefined> {
  const raw = await findLegacyRawData(sources);
  if (raw === undefined) return undefined;

  const legacyProjects = collectLegacyProjects(raw);
  if (legacyProjects.length === 0) return undefined;

  return legacyProjects.map((legacy) => {
    const { project, warnings } = migrate(legacy, deps);
    return { project, warnings };
  });
}
