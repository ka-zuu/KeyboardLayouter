/**
 * アプリ全体で共有する `AppStorage` の 1 インスタンスと、
 * 永続化する「既知のプロジェクト一覧」キャッシュ。
 *
 * `projects` キーは `Record<string, ProjectModel>` を丸ごと書き込む方式
 * (docs/adr/0004-storage.md) なので、現在アクティブな 1 件だけを保存すると
 * 他のプロジェクトを消してしまう。`ui/hooks/useBootstrap.ts` が起動時に
 * 読み込んだ内容をここへ渡し、`ui/hooks/useAutoSave.ts` が変更のたびに
 * この中の 1 件を差し替えて書き戻す。
 */
import type { ProjectModel } from '@/core/model/types';
import { createLocalStorageBackend } from './backend';
import { createAppIndexedDBBackend } from './idb';
import { createAppStorage, type AppStorage, type SaveStatus } from './appStorage';

let storage: AppStorage | null = null;
let projectsCache: Record<string, ProjectModel> = {};
const statusListeners = new Set<(status: SaveStatus) => void>();

function notify(status: SaveStatus): void {
  for (const listener of statusListeners) listener(status);
}

export function getAppStorage(): AppStorage {
  storage ??= createAppStorage({
    primary: createAppIndexedDBBackend(),
    fallback: createLocalStorageBackend(),
    onStatusChange: notify,
  });
  return storage;
}

export function onSaveStatusChange(listener: (status: SaveStatus) => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export function setProjectsCache(projects: Record<string, ProjectModel>): void {
  projectsCache = projects;
}

/** キャッシュに 1 件追加・上書きし、更新後の全体を返す。 */
export function rememberProject(project: ProjectModel): Record<string, ProjectModel> {
  projectsCache = { ...projectsCache, [project.id]: project };
  return projectsCache;
}

export function pickMostRecentlyUpdated(projects: Record<string, ProjectModel>): ProjectModel | undefined {
  const values = Object.values(projects);
  if (values.length === 0) return undefined;
  return values.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a));
}
