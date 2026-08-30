/**
 * プロジェクト名・キーボードメタ情報 (`docs/UI_SPEC.md#無選択-プロジェクト設定`) の更新。
 * 他の `core/commands/*` と同じ `(project, patch) => project` の契約を保つ。
 */
import { defaultDeps, type ModelDeps } from '@/core/model/deps';
import { touch } from '@/core/model/project';
import type { KeyboardMeta, ProjectModel, UsbInfo } from '@/core/model/types';

export interface UpdateProjectMetaPatch {
  name?: string;
  meta?: Partial<Omit<KeyboardMeta, 'usb'>> & { usb?: Partial<UsbInfo> };
}

export function updateProjectMeta(project: ProjectModel, patch: UpdateProjectMetaPatch, deps: ModelDeps = defaultDeps): ProjectModel {
  let next = project;

  if (patch.name !== undefined && patch.name !== next.name) {
    next = { ...next, name: patch.name };
  }

  if (patch.meta) {
    const mergedMeta: KeyboardMeta = { ...next.meta, ...patch.meta, usb: next.meta.usb };
    if (patch.meta.usb) mergedMeta.usb = { ...next.meta.usb, ...patch.meta.usb };
    next = { ...next, meta: mergedMeta };
  }

  if (next === project) return project;
  return touch(next, deps);
}
