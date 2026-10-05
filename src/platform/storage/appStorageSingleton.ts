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
/** 起動時の読み込み (`setProjectsCache`) が済んだか。済む前に書き込むと保存済みの一覧を消してしまう。 */
let projectsCacheLoaded = false;
const statusListeners = new Set<(status: SaveStatus) => void>();
const projectsListeners = new Set<(projects: Record<string, ProjectModel>) => void>();

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

/**
 * プロジェクト一覧キャッシュの変更を購読する (左パネルのプロジェクト一覧用)。
 * 登録直後に現在の内容で 1 回呼ぶ。
 */
export function onProjectsChange(listener: (projects: Record<string, ProjectModel>) => void): () => void {
  projectsListeners.add(listener);
  listener(projectsCache);
  return () => projectsListeners.delete(listener);
}

function updateProjectsCache(next: Record<string, ProjectModel>): Record<string, ProjectModel> {
  projectsCache = next;
  for (const listener of projectsListeners) listener(projectsCache);
  return projectsCache;
}

export function getProjectsCache(): Record<string, ProjectModel> {
  return projectsCache;
}

export function setProjectsCache(projects: Record<string, ProjectModel>): void {
  projectsCacheLoaded = true;
  updateProjectsCache(projects);
}

export function isProjectsCacheLoaded(): boolean {
  return projectsCacheLoaded;
}

/** キャッシュに 1 件追加・上書きし、更新後の全体を返す。 */
export function rememberProject(project: ProjectModel): Record<string, ProjectModel> {
  if (projectsCache[project.id] === project) return projectsCache;
  return updateProjectsCache({ ...projectsCache, [project.id]: project });
}

/** キャッシュから 1 件取り除き、更新後の全体を返す。 */
export function forgetProject(id: string): Record<string, ProjectModel> {
  if (!(id in projectsCache)) return projectsCache;
  const rest = { ...projectsCache };
  delete rest[id];
  return updateProjectsCache(rest);
}

export function pickMostRecentlyUpdated(projects: Record<string, ProjectModel>): ProjectModel | undefined {
  const values = Object.values(projects);
  if (values.length === 0) return undefined;
  return values.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a));
}
