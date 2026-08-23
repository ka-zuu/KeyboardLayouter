import { aabbOfKeys } from '@/core/geometry/shape';
import { round4 } from '@/core/geometry/snap';
import { defaultDeps, type ModelDeps } from './deps';
import { SCHEMA_VERSION, type KeyModel, type ProjectModel } from './types';

export function createProject(name = 'Untitled', deps: ModelDeps = defaultDeps): ProjectModel {
  const now = deps.now();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: deps.newId(),
    name,
    keys: [],
    meta: {
      keyboardName: name,
      manufacturer: '',
      maintainer: '',
      url: '',
      usb: { vid: '0xFEED', pid: '0x0000', deviceVersion: '0.0.1' },
      diodeDirection: 'COL2ROW',
      split: false,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function findKey(project: ProjectModel, id: string): KeyModel | null {
  return project.keys.find((k) => k.id === id) ?? null;
}

/** 指定した id のキーだけを差し替えた新しいプロジェクトを返す (id にないキーはそのまま)。 */
export function replaceKeys(project: ProjectModel, updates: ReadonlyMap<string, KeyModel>): ProjectModel {
  if (updates.size === 0) return project;
  return {
    ...project,
    keys: project.keys.map((k) => updates.get(k.id) ?? k),
  };
}

/** `updatedAt` を現在時刻に更新した新しいプロジェクトを返す。 */
export function touch(project: ProjectModel, deps: ModelDeps = defaultDeps): ProjectModel {
  return { ...project, updatedAt: deps.now() };
}

/**
 * 全キーの AABB の左上が原点になるよう平行移動した新しいプロジェクトを返す。
 * プロジェクト自体は変更しない (docs/GEOMETRY.md#座標の範囲)。
 * キーが 0 件のときは何もしない。
 */
export function normalizeOrigin(project: ProjectModel): ProjectModel {
  const box = aabbOfKeys(project.keys);
  if (box === null) return project;
  const dx = -round4(box.minX);
  const dy = -round4(box.minY);
  if (dx === 0 && dy === 0) return project;

  return {
    ...project,
    keys: project.keys.map((key) => ({
      ...key,
      position: { x: round4(key.position.x + dx), y: round4(key.position.y + dy) },
      rotation: {
        angle: key.rotation.angle,
        origin: key.rotation.origin
          ? { x: round4(key.rotation.origin.x + dx), y: round4(key.rotation.origin.y + dy) }
          : null,
      },
    })),
  };
}

/**
 * 出力用にキーを並べ替える。マトリクス割り当て済みなら Row → Col、
 * そうでなければ Y → X の順 (docs/formats/README.md#出力時の共通ルール)。
 * 順序が安定しないとゴールデンファイル比較ができないため、同値のときは
 * 元の配列内の順序 (id) にフォールバックする。
 */
export function sortKeysForOutput(keys: readonly KeyModel[]): KeyModel[] {
  return [...keys].sort((a, b) => {
    if (a.matrix !== null && b.matrix !== null) {
      if (a.matrix.row !== b.matrix.row) return a.matrix.row - b.matrix.row;
      if (a.matrix.col !== b.matrix.col) return a.matrix.col - b.matrix.col;
    } else if (a.matrix !== null || b.matrix !== null) {
      // 割り当て済みのキーを先に出す。
      return a.matrix !== null ? -1 : 1;
    }
    if (a.position.y !== b.position.y) return a.position.y - b.position.y;
    if (a.position.x !== b.position.x) return a.position.x - b.position.x;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
