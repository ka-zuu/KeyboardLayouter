/**
 * 自動保存。docs/ARCHITECTURE.md#永続化 / docs/adr/0004-storage.md。
 *
 * プロジェクトが変わるたびに `appStorage` へ書く (1000ms デバウンスは
 * appStorage 側の責務)。`enabled` が false の間は書き込まない —
 * `useBootstrap` がまだ読み込み中のプレースホルダ (空の新規プロジェクト) を
 * 誤って保存してしまうのを防ぐため、呼び出し側は bootstrap 完了後に
 * `enabled: true` を渡すこと。
 */
import { useEffect, useState } from 'react';
import { getAppStorage, onSaveStatusChange, rememberProject } from '@/platform/storage/appStorageSingleton';
import type { SaveStatus } from '@/platform/storage/appStorage';
import { useEditorStore, useProjectStore } from '@/state/appState';

export interface UseAutoSaveOptions {
  enabled: boolean;
}

export function useAutoSave(options: UseAutoSaveOptions): SaveStatus {
  const { enabled } = options;
  const [status, setStatus] = useState<SaveStatus>('idle');

  const project = useProjectStore((s) => s.project);
  const gridSize = useEditorStore((s) => s.gridSize);
  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const theme = useEditorStore((s) => s.theme);

  useEffect(() => onSaveStatusChange(setStatus), []);

  useEffect(() => {
    if (!enabled) return;
    const storage = getAppStorage();
    const projects = rememberProject(project);
    storage.saveProjects(projects);
    storage.saveCurrentProjectId(project.id);
  }, [enabled, project]);

  useEffect(() => {
    if (!enabled) return;
    getAppStorage().saveEditorPrefs({ gridSize, snapEnabled, theme });
  }, [enabled, gridSize, snapEnabled, theme]);

  return status;
}
