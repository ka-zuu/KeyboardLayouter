import { rotatePoint } from '@/core/geometry/rect';
import { aabbOfKeys } from '@/core/geometry/shape';
import { round4 } from '@/core/geometry/snap';
import { touch } from '@/core/model/project';
import type { PointU, ProjectModel } from '@/core/model/types';

export interface RotateKeysOptions {
  /** 複数キー選択時のオービット中心。省略時は対象キーの AABB 中心。 */
  orbitCenter?: PointU;
}

/**
 * 対象キーを回転させる。docs/GEOMETRY.md#複数選択の一括回転-オービット。
 *
 * - 単体選択: 自身の回転中心 (rotation.origin ?? 幾何中心) を軸に
 *   `rotation.angle` を加算するだけ。position は変えない。
 * - 複数選択: 選択範囲全体の中心 (既定は対象キーの AABB 中心) を軸に
 *   すべてのキーが公転する。各キーについて (1) position を軸周りに回転
 *   (2) rotation.angle に同じ角度を加算 (3) rotation.origin が非 null なら
 *   それも軸周りに回転、の 3 手順をそのまま適用する。
 */
export function rotateKeys(
  project: ProjectModel,
  ids: readonly string[],
  deltaAngleDeg: number,
  options: RotateKeysOptions = {},
): ProjectModel {
  if (ids.length === 0 || deltaAngleDeg === 0) return project;
  const idSet = new Set(ids);
  const targets = project.keys.filter((k) => idSet.has(k.id));
  if (targets.length === 0) return project;

  if (targets.length === 1) {
    return touch({
      ...project,
      keys: project.keys.map((k) =>
        idSet.has(k.id) ? { ...k, rotation: { angle: round4(k.rotation.angle + deltaAngleDeg), origin: k.rotation.origin } } : k,
      ),
    });
  }

  const box = aabbOfKeys(targets);
  const center = options.orbitCenter ?? { x: (box!.minX + box!.maxX) / 2, y: (box!.minY + box!.maxY) / 2 };

  return touch({
    ...project,
    keys: project.keys.map((k) => {
      if (!idSet.has(k.id)) return k;
      const newPosition = rotatePoint(k.position, center, deltaAngleDeg);
      const newOrigin = k.rotation.origin ? rotatePoint(k.rotation.origin, center, deltaAngleDeg) : null;
      return {
        ...k,
        position: { x: round4(newPosition.x), y: round4(newPosition.y) },
        rotation: {
          angle: round4(k.rotation.angle + deltaAngleDeg),
          origin: newOrigin ? { x: round4(newOrigin.x), y: round4(newOrigin.y) } : null,
        },
      };
    }),
  });
}
