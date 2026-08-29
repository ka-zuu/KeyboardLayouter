/** commands 内部で共有する小さなヘルパ。 */
import { round4 } from '@/core/geometry/snap';
import type { KeyModel, PointU, SizeU } from '@/core/model/types';

/** キーの position (と rotation.origin があればそれも) を delta だけ平行移動する。 */
export function translateKey(key: KeyModel, deltaU: PointU): KeyModel {
  if (deltaU.x === 0 && deltaU.y === 0) return key;
  return {
    ...key,
    position: { x: round4(key.position.x + deltaU.x), y: round4(key.position.y + deltaU.y) },
    rotation: {
      angle: key.rotation.angle,
      origin: key.rotation.origin
        ? { x: round4(key.rotation.origin.x + deltaU.x), y: round4(key.rotation.origin.y + deltaU.y) }
        : null,
    },
  };
}

function aabbOverlaps(
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number },
): boolean {
  const epsilon = 0.001;
  return a.left < b.right - epsilon && a.right > b.left + epsilon && a.top < b.bottom - epsilon && a.bottom > b.top + epsilon;
}

/**
 * 新規キーを追加するとき、既存キーと重なる場合はグリッド幅単位で右方向に
 * ずらして空きを探す (docs/UI_SPEC.md#キーの重なり、旧アプリと同じ挙動)。
 * 最大 100 回試行し、見つからなければ最後の位置をそのまま返す。
 * 判定は主矩形の AABB のみを使う (旧アプリと同じ簡易判定)。
 */
export function findNonOverlappingPosition(
  existing: readonly KeyModel[],
  candidate: PointU,
  size: SizeU,
  gridSize: number,
): PointU {
  const MAX_RETRIES = 100;
  let x = candidate.x;
  const y = candidate.y;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const box = { left: x, right: x + size.w, top: y, bottom: y + size.h };
    const overlapping = existing.some((k) =>
      aabbOverlaps(box, { left: k.position.x, right: k.position.x + k.size.w, top: k.position.y, bottom: k.position.y + k.size.h }),
    );
    if (!overlapping) break;
    x += gridSize;
  }

  return { x: round4(x), y: round4(y) };
}
