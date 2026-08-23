import { defaultDeps, type ModelDeps } from '@/core/model/deps';
import { createKey } from '@/core/model/key';
import { touch } from '@/core/model/project';
import type { KeyModel, ProjectModel } from '@/core/model/types';
import { findNonOverlappingPosition } from './shared';

export interface AddKeysOptions {
  /** 既存キーとの重なりを避けて右にずらすためのグリッド幅 (U)。省略時はずらさない。 */
  gridSize?: number;
}

/**
 * partials で指定した内容のキーを追加する。gridSize を渡すと、既存キーと
 * 重なる場合にグリッド幅単位で右にずらして空きを探す
 * (docs/UI_SPEC.md#キーの重なり)。
 */
export function addKeys(
  project: ProjectModel,
  partials: readonly Partial<KeyModel>[],
  options: AddKeysOptions = {},
  deps: ModelDeps = defaultDeps,
): ProjectModel {
  if (partials.length === 0) return project;

  const existing = [...project.keys];
  const added: KeyModel[] = [];

  for (const partial of partials) {
    let key = createKey(partial, deps);
    if (options.gridSize !== undefined) {
      key = { ...key, position: findNonOverlappingPosition([...existing, ...added], key.position, key.size, options.gridSize) };
    }
    added.push(key);
  }

  return touch({ ...project, keys: [...project.keys, ...added] }, deps);
}
