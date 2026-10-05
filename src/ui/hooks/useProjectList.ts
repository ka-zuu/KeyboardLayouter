/**
 * 保存済みプロジェクトの一覧 (docs/UI_SPEC.md#プロジェクト一覧)。
 * 現在のプロジェクトを先頭に固定し、残りを更新日時の降順で並べる。
 * 現在のプロジェクトはキャッシュではなく `projectStore` の値を使う (名前の編集が即座に反映されるように)。
 */
import { useMemo, useSyncExternalStore } from 'react';
import type { ProjectModel } from '@/core/model/types';
import { getProjectsCache, onProjectsChange } from '@/platform/storage/appStorageSingleton';
import { useProjectStore } from '@/state/appState';

function subscribe(onChange: () => void): () => void {
  return onProjectsChange(onChange);
}

export function useProjectList(): ProjectModel[] {
  const projects = useSyncExternalStore(subscribe, getProjectsCache);
  const current = useProjectStore((s) => s.project);

  return useMemo(() => {
    const others = Object.values(projects)
      .filter((p) => p.id !== current.id)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return [current, ...others];
  }, [projects, current]);
}
