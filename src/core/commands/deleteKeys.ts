import { touch } from '@/core/model/project';
import type { ProjectModel } from '@/core/model/types';

export function deleteKeys(project: ProjectModel, ids: readonly string[]): ProjectModel {
  if (ids.length === 0) return project;
  const idSet = new Set(ids);
  const keys = project.keys.filter((k) => !idSet.has(k.id));
  if (keys.length === project.keys.length) return project;
  return touch({ ...project, keys });
}
