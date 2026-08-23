import { touch } from '@/core/model/project';
import type { PointU, ProjectModel } from '@/core/model/types';
import { translateKey } from './shared';

/** 対象キーを deltaU だけ平行移動する (docs/ARCHITECTURE.md#状態管理と履歴の例)。 */
export function moveKeys(project: ProjectModel, ids: readonly string[], deltaU: PointU): ProjectModel {
  if (ids.length === 0 || (deltaU.x === 0 && deltaU.y === 0)) return project;
  const idSet = new Set(ids);
  return touch({
    ...project,
    keys: project.keys.map((k) => (idSet.has(k.id) ? translateKey(k, deltaU) : k)),
  });
}
