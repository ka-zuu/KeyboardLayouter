import { touch } from '@/core/model/project';
import type { MatrixAddress, ProjectModel } from '@/core/model/types';

/** 単一キーのマトリクスを手動で設定する (右インスペクタの Row/Col 入力用)。 */
export function setMatrix(project: ProjectModel, id: string, matrix: MatrixAddress | null): ProjectModel {
  const index = project.keys.findIndex((k) => k.id === id);
  if (index === -1) return project;
  const keys = [...project.keys];
  const key = keys[index]!;
  keys[index] = { ...key, matrix };
  return touch({ ...project, keys });
}
