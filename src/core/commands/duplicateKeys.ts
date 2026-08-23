import { defaultDeps, type ModelDeps } from '@/core/model/deps';
import { cloneKey } from '@/core/model/key';
import { touch } from '@/core/model/project';
import type { PointU, ProjectModel } from '@/core/model/types';
import { translateKey } from './shared';

/**
 * 対象キーを複製する。複製後のキーは offsetU だけずらした位置に置く
 * (docs/TESTING.md#e2e-テスト の「複製すると、グリッド幅分ずれた位置に増える」)。
 * offsetU には呼び出し側 (state 層) が現在のグリッド幅を渡す。
 */
export function duplicateKeys(
  project: ProjectModel,
  ids: readonly string[],
  offsetU: PointU,
  deps: ModelDeps = defaultDeps,
): ProjectModel {
  if (ids.length === 0) return project;
  const idSet = new Set(ids);
  const clones = project.keys.filter((k) => idSet.has(k.id)).map((k) => translateKey(cloneKey(k, deps), offsetU));
  if (clones.length === 0) return project;
  return touch({ ...project, keys: [...project.keys, ...clones] }, deps);
}
