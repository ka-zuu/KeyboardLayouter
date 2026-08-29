import { touch } from '@/core/model/project';
import type { KeyModel, ProjectModel } from '@/core/model/types';

/**
 * 対象キーに patch を適用する。ほとんどのフィールドは丸ごと置き換えるが、
 * `legends` だけは指定したスロットのみを差し替える (インスペクタでの
 * 1 スロットずつの編集に対応するため。他のスロットを消さない)。
 */
export function updateKeyProps(project: ProjectModel, ids: readonly string[], patch: Partial<KeyModel>): ProjectModel {
  if (ids.length === 0) return project;
  const idSet = new Set(ids);
  return touch({
    ...project,
    keys: project.keys.map((k) => {
      if (!idSet.has(k.id)) return k;
      const next: KeyModel = { ...k, ...patch };
      if (patch.legends) next.legends = { ...k.legends, ...patch.legends };
      return next;
    }),
  });
}
