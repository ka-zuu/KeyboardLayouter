/**
 * 電気マトリクスの自動割り当て。docs/MATRIX.md#自動割り当て-auto-assign と 1 対 1。
 * legacy/v1 の store/useStore.ts の autoAssignMatrix を移植する。
 */
import { ROW_TOLERANCE_U } from '@/core/geometry/units';
import { rotatePoint, rotationCenterOf } from '@/core/geometry/rect';
import type { KeyModel, MatrixAddress, PointU, ProjectModel } from '@/core/model/types';

export interface AutoAssignOptions {
  startRow: number;
  startCol: number;
  /** 同一行と見なす Y 差 (U)。既定 0.1。 */
  rowTolerance?: number;
}

/**
 * 回転を考慮したキーの中心座標。回転クラスタ (親指キー等) を
 * position のままで並べると行が乱れるため (docs/MATRIX.md#回転したキーの扱い)。
 */
function centerOf(key: KeyModel): PointU {
  const center = { x: key.position.x + key.size.w / 2, y: key.position.y + key.size.h / 2 };
  if (key.rotation.angle === 0) return center;
  return rotatePoint(center, rotationCenterOf(key), key.rotation.angle);
}

/**
 * 物理配置から Row/Col を推定して割り当てる。
 *
 * targetIds が null なら decal を除く全キー、非 null ならその中から
 * decal を除いたキーが対象。Y 座標を rowTolerance 単位のバケットに
 * 量子化してから比較することで、比較関数の推移律を保つ
 * (docs/MATRIX.md#量子化を外してはいけない理由。ここを単純化して
 * 素朴な差分比較に戻さないこと)。
 */
export function autoAssignMatrix(
  project: ProjectModel,
  targetIds: readonly string[] | null,
  options: AutoAssignOptions,
): ProjectModel {
  const rowTolerance = options.rowTolerance ?? ROW_TOLERANCE_U;
  const targetSet = targetIds ? new Set(targetIds) : null;
  const targets = project.keys.filter((k) => !k.decal && (targetSet === null || targetSet.has(k.id)));
  if (targets.length === 0) return project;

  const centers = new Map<string, PointU>(targets.map((k) => [k.id, centerOf(k)]));
  const bucketOf = (y: number): number => Math.round(y / rowTolerance);

  const sorted = [...targets].sort((a, b) => {
    const ca = centers.get(a.id)!;
    const cb = centers.get(b.id)!;
    const bucketA = bucketOf(ca.y);
    const bucketB = bucketOf(cb.y);
    if (bucketA !== bucketB) return ca.y - cb.y;
    return ca.x - cb.x;
  });

  const updates = new Map<string, MatrixAddress>();
  let currentRowY = -Infinity;
  let currentRowIndex = options.startRow - 1;
  let currentColIndex = options.startCol;

  for (const key of sorted) {
    const center = centers.get(key.id)!;
    if (Math.abs(center.y - currentRowY) > rowTolerance) {
      currentRowY = center.y;
      currentRowIndex += 1;
      currentColIndex = options.startCol;
    } else {
      currentColIndex += 1;
    }
    updates.set(key.id, { row: currentRowIndex, col: currentColIndex });
  }

  return {
    ...project,
    keys: project.keys.map((key) => {
      const update = updates.get(key.id);
      return update ? { ...key, matrix: update } : key;
    }),
  };
}
