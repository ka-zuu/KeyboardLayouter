/**
 * 複数プロジェクトの管理 (docs/UI_SPEC.md#ツールバー のプロジェクトメニュー、
 * docs/UI_SPEC.md#プロジェクト一覧)。
 *
 * 保存済みプロジェクトの一覧は `platform/storage/appStorageSingleton.ts` のキャッシュが持つ。
 * 現在のプロジェクトの変更は `ui/hooks/useAutoSave.ts` がキャッシュへ反映するため、
 * ここでは切り替え (`loadProject`) と、一覧そのものの増減 (追加・削除) だけを扱う。
 *
 * `actions.ts` と分けているのは、ストレージ (IndexedDB) に触るのがこのファイルだけに
 * なるようにするため (`actions.ts` はユニットテストからストアだけで呼べる)。
 */
import { createProject, duplicateProject } from '@/core/model/project';
import type { ProjectModel } from '@/core/model/types';
import { forgetProject, getAppStorage, getProjectsCache, pickMostRecentlyUpdated, rememberProject } from '@/platform/storage/appStorageSingleton';
import { useEditorStore, useProjectStore } from './appState';

function activate(project: ProjectModel): void {
  // 切り替え前の内容を確実に一覧へ残す (自動保存の effect より先に一覧が読まれても欠けないように)。
  rememberProject(useProjectStore.getState().project);
  rememberProject(project);
  useProjectStore.getState().loadProject(project);
  useEditorStore.getState().clearSelection();
}

export function switchProject(id: string): void {
  if (id === useProjectStore.getState().project.id) return;
  const target = getProjectsCache()[id];
  if (target) activate(target);
}

export function createNewProject(): void {
  activate(createProject());
}

export function duplicateProjectById(id: string): void {
  const current = useProjectStore.getState().project;
  const source = id === current.id ? current : getProjectsCache()[id];
  if (source) activate(duplicateProject(source));
}

export function renameCurrentProject(name: string): void {
  const trimmed = name.trim();
  if (trimmed === '') return;
  useProjectStore.getState().updateProjectMeta({ name: trimmed });
}

/**
 * プロジェクトを一覧から削除する。現在のプロジェクトを削除した場合は、
 * 残りのうち最も新しく更新されたものへ切り替え、無ければ新規プロジェクトを作る。
 */
export function deleteProjectById(id: string): void {
  const isCurrent = id === useProjectStore.getState().project.id;
  const remaining = forgetProject(id);
  if (isCurrent) {
    const next = pickMostRecentlyUpdated(remaining) ?? createProject();
    rememberProject(next);
    useProjectStore.getState().loadProject(next);
    useEditorStore.getState().clearSelection();
  }
  getAppStorage().saveProjects(getProjectsCache());
}
