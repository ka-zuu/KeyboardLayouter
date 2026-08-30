/**
 * 起動時の読み込み。docs/adr/0004-storage.md / docs/MIGRATION_FROM_MKD.md#ブラウザに残ったデータの取り込み。
 *
 * 1. `appStorage` から `projects` / `currentProjectId` / `editorPrefs` を読む
 * 2. 現在のプロジェクトが見つからなければ (=本アプリのデータが空)、
 *    旧アプリ (MKD) のデータを探して取り込む。取り込んだ内容はすぐに
 *    `appStorage` へ書き戻す (次回以降は本アプリのデータから読めるようにするため)
 * 3. それでも無ければ新規プロジェクトを作る
 *
 * 見つかったプロジェクトは `projectStore.loadProject()` で反映する。
 * **旧データ (IndexedDB `mkd-db` / localStorage `mkd-storage`) は削除しない。**
 */
import { useEffect, useRef, useState } from 'react';
import { createProject } from '@/core/model/project';
import type { ProjectModel } from '@/core/model/types';
import { importLegacyProjects } from '@/platform/storage/legacyImport';
import { getAppStorage, pickMostRecentlyUpdated, rememberProject, setProjectsCache } from '@/platform/storage/appStorageSingleton';
import { useEditorStore, useProjectStore } from '@/state/appState';

export type BootstrapStatus = 'loading' | 'ready';

export function useBootstrap(): BootstrapStatus {
  const [status, setStatus] = useState<BootstrapStatus>('loading');
  // React 18/19 の Strict Mode はマウント時の effect を開発時に 2 回実行するため、
  // 実処理 (IndexedDB 読み込み・旧データ取り込み) を 1 回だけに限定する。
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;

    async function run(): Promise<void> {
      const storage = getAppStorage();
      const [storedProjects, currentId, prefs] = await Promise.all([
        storage.loadProjects(),
        storage.loadCurrentProjectId(),
        storage.loadEditorPrefs(),
      ]);

      let projects = storedProjects ?? {};
      setProjectsCache(projects);

      let initial: ProjectModel | undefined = currentId !== undefined ? projects[currentId] : undefined;
      initial ??= pickMostRecentlyUpdated(projects);

      if (!initial) {
        const legacy = await importLegacyProjects();
        if (legacy && legacy.length > 0) {
          for (const { project } of legacy) {
            projects = rememberProject(project);
          }
          initial = pickMostRecentlyUpdated(projects);
          if (initial) {
            storage.saveProjects(projects);
            storage.saveCurrentProjectId(initial.id);
          }
        }
      }

      if (!initial) {
        initial = createProject();
        rememberProject(initial);
      }

      if (cancelled) return;

      useProjectStore.getState().loadProject(initial);
      if (prefs) {
        const editor = useEditorStore.getState();
        editor.setGridSize(prefs.gridSize);
        editor.setSnapEnabled(prefs.snapEnabled);
        editor.setTheme(prefs.theme);
      }
      setStatus('ready');
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
