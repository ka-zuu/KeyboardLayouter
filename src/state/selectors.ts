/**
 * プロジェクトストアと編集ストアから派生する値。
 * 素の関数として提供し、呼び出し側 (コンポーネント) で `useMemo` するかは委ねる。
 */
import { aabbOfKeys, type AABB } from '@/core/geometry/shape';
import { validateMatrix, type MatrixReport } from '@/core/matrix/validate';
import type { KeyModel, ProjectModel } from '@/core/model/types';

/** 選択中の KeyModel の配列。プロジェクトの並び順を保つ。 */
export function selectedKeysOf(project: ProjectModel, selectedKeyIds: readonly string[]): KeyModel[] {
  if (selectedKeyIds.length === 0) return [];
  const idSet = new Set(selectedKeyIds);
  return project.keys.filter((k) => idSet.has(k.id));
}

/** 選択範囲全体の AABB (形状・回転を考慮)。選択が無ければ null。 */
export function selectionAABB(project: ProjectModel, selectedKeyIds: readonly string[]): AABB | null {
  return aabbOfKeys(selectedKeysOf(project, selectedKeyIds));
}

/** マトリクスの検証結果。docs/UI_SPEC.md#無選択-プロジェクト設定 の「マトリクス検証」用。 */
export function matrixReportOf(project: ProjectModel): MatrixReport {
  return validateMatrix(project);
}
