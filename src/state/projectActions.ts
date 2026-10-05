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
import {
  forgetProject,
  getAppStorage,
  getProjectsCache,
  isProjectsCacheLoaded,
  pickMostRecentlyUpdated,
  rememberProject,
} from '@/platform/storage/appStorageSingleton';
import { useEditorStore, useFeedbackStore, useProjectStore } from './appState';

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

/**
 * 明示保存 (`Cmd/Ctrl+S`、docs/UI_SPEC.md#キーボードショートカット)。
 * 自動保存のデバウンスを待たずに、現在のプロジェクトを即座に書き込む。
 * 起動時の読み込みが済む前は、読み込み中のプレースホルダで保存済みの一覧を上書きしないよう
 * 何もせず 'not-ready' を返す (`useAutoSave` の `enabled` と同じ理由)。
 */
export async function saveNow(): Promise<'saved' | 'failed' | 'not-ready'> {
  if (!isProjectsCacheLoaded()) return 'not-ready';
  const storage = getAppStorage();
  const project = useProjectStore.getState().project;
  storage.saveProjects(rememberProject(project));
  storage.saveCurrentProjectId(project.id);
  return (await storage.flush()) ? 'saved' : 'failed';
}

/** 明示保存して結果をトーストで知らせる (ショートカットとプロジェクトメニューで共用)。 */
export async function saveAndNotify(): Promise<void> {
  const result = await saveNow();
  const { pushToast } = useFeedbackStore.getState();
  if (result === 'saved') pushToast({ kind: 'success', message: '保存しました' });
  else if (result === 'failed') pushToast({ kind: 'error', message: '保存に失敗しました。ブラウザの保存領域が使えない可能性があります。' });
  else pushToast({ kind: 'info', message: '読み込み中のため保存できません。少し待ってからもう一度お試しください。' });
}
