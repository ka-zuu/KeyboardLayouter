/**
 * プロジェクト JSON の書き出し。docs/formats/PROJECT_JSON.md と 1 対 1。
 */
import { round4 } from '@/core/geometry/snap';
import { normalizeOrigin, sortKeysForOutput } from '@/core/model/project';
import type { KeyModel, ProjectModel } from '@/core/model/types';
import type { SerializeResult } from '../types';

export interface SerializeProjectOptions {
  /** AABB 左上を原点に正規化するか (既定 true。docs/GEOMETRY.md#座標の範囲)。 */
  normalize?: boolean;
}

function roundKeyCoordinates(key: KeyModel): KeyModel {
  return {
    ...key,
    position: { x: round4(key.position.x), y: round4(key.position.y) },
    size: { w: round4(key.size.w), h: round4(key.size.h) },
    rotation: {
      angle: round4(key.rotation.angle),
      origin: key.rotation.origin ? { x: round4(key.rotation.origin.x), y: round4(key.rotation.origin.y) } : null,
    },
    secondary: key.secondary
      ? { x: round4(key.secondary.x), y: round4(key.secondary.y), w: round4(key.secondary.w), h: round4(key.secondary.h) }
      : null,
    polygon: key.polygon ? key.polygon.map((p) => ({ x: round4(p.x), y: round4(p.y) })) : null,
  };
}

/** ファイル名の既定値。プロジェクト名の空白を `_` に置換する。 */
export function projectFileName(project: Pick<ProjectModel, 'name'>): string {
  const base = project.name.trim().replace(/\s+/g, '_');
  return `${base.length > 0 ? base : 'Untitled'}.json`;
}

/**
 * プロジェクトをファイル出力用に直列化する。
 * 正規化 → キー並べ替え (Y→X / Row→Col) → 座標の丸め → 2 スペース indent・LF。
 * プロジェクト自体は変更しない。
 */
export function serializeProject(project: ProjectModel, options: SerializeProjectOptions = {}): SerializeResult {
  const normalize = options.normalize ?? true;
  const normalized = normalize ? normalizeOrigin(project) : project;
  const keys = sortKeysForOutput(normalized.keys).map(roundKeyCoordinates);
  const output: ProjectModel = { ...normalized, keys };

  const json = `${JSON.stringify(output, null, 2)}\n`;

  return {
    files: [{ name: projectFileName(project), content: json }],
    warnings: [],
  };
}
