import { aabbOfKey } from '@/core/geometry/shape';
import { touch } from '@/core/model/project';
import type { PointU, ProjectModel } from '@/core/model/types';
import { translateKey } from './shared';

/** docs/UI_SPEC.md#複数選択 の「整列: 左 / 水平中央 / 右 / 上 / 垂直中央 / 下」。 */
export type AlignEdge = 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom';

/**
 * 対象キーを共通の基準線に揃える。基準線は対象キー全体の輪郭 AABB
 * (形状・回転を考慮したもの) から求める。2 個未満のときは何もしない。
 */
export function alignKeys(project: ProjectModel, ids: readonly string[], edge: AlignEdge): ProjectModel {
  const idSet = new Set(ids);
  const targets = project.keys.filter((k) => idSet.has(k.id));
  if (targets.length < 2) return project;

  const boxes = new Map(targets.map((k) => [k.id, aabbOfKey(k)] as const));
  const all = [...boxes.values()];

  let targetValue: number;
  switch (edge) {
    case 'left':
      targetValue = Math.min(...all.map((b) => b.minX));
      break;
    case 'right':
      targetValue = Math.max(...all.map((b) => b.maxX));
      break;
    case 'top':
      targetValue = Math.min(...all.map((b) => b.minY));
      break;
    case 'bottom':
      targetValue = Math.max(...all.map((b) => b.maxY));
      break;
    case 'centerH': {
      const minX = Math.min(...all.map((b) => b.minX));
      const maxX = Math.max(...all.map((b) => b.maxX));
      targetValue = (minX + maxX) / 2;
      break;
    }
    case 'centerV': {
      const minY = Math.min(...all.map((b) => b.minY));
      const maxY = Math.max(...all.map((b) => b.maxY));
      targetValue = (minY + maxY) / 2;
      break;
    }
  }

  return touch({
    ...project,
    keys: project.keys.map((k) => {
      const box = boxes.get(k.id);
      if (!box) return k;
      const delta: PointU = (() => {
        switch (edge) {
          case 'left':
            return { x: targetValue - box.minX, y: 0 };
          case 'right':
            return { x: targetValue - box.maxX, y: 0 };
          case 'top':
            return { x: 0, y: targetValue - box.minY };
          case 'bottom':
            return { x: 0, y: targetValue - box.maxY };
          case 'centerH':
            return { x: targetValue - (box.minX + box.maxX) / 2, y: 0 };
          case 'centerV':
            return { x: 0, y: targetValue - (box.minY + box.maxY) / 2 };
        }
      })();
      return translateKey(k, delta);
    }),
  });
}
