import { aabbOfKey, type AABB } from '@/core/geometry/shape';
import { touch } from '@/core/model/project';
import type { KeyModel, PointU, ProjectModel } from '@/core/model/types';
import { translateKey } from './shared';

/** docs/UI_SPEC.md#複数選択 の「分布: 水平方向に等間隔 / 垂直方向に等間隔」。 */
export type DistributeAxis = 'horizontal' | 'vertical';

/**
 * 対象キーを軸方向に等間隔に並べ直す (端のキーは動かさず、間の隙間を揃える)。
 * 3 個未満のときは (分布の意味が無いため) 何もしない。
 */
export function distributeKeys(project: ProjectModel, ids: readonly string[], axis: DistributeAxis): ProjectModel {
  const idSet = new Set(ids);
  const targets = project.keys.filter((k) => idSet.has(k.id));
  if (targets.length < 3) return project;

  const isHorizontal = axis === 'horizontal';
  const start = (box: AABB): number => (isHorizontal ? box.minX : box.minY);
  const end = (box: AABB): number => (isHorizontal ? box.maxX : box.maxY);

  const entries = targets
    .map((key) => ({ key, box: aabbOfKey(key) }))
    .sort((a, b) => start(a.box) - start(b.box));

  const first = entries[0]!;
  const last = entries[entries.length - 1]!;
  const totalSpan = end(last.box) - start(first.box);
  const totalSize = entries.reduce((sum, { box }) => sum + (end(box) - start(box)), 0);
  const gap = (totalSpan - totalSize) / (entries.length - 1);

  const deltas = new Map<string, PointU>();
  let cursor = start(first.box);
  for (const { key, box } of entries) {
    const size = end(box) - start(box);
    const delta = cursor - start(box);
    deltas.set(key.id, isHorizontal ? { x: delta, y: 0 } : { x: 0, y: delta });
    cursor += size + gap;
  }

  return touch({
    ...project,
    keys: project.keys.map((k: KeyModel) => {
      const delta = deltas.get(k.id);
      return delta ? translateKey(k, delta) : k;
    }),
  });
}
