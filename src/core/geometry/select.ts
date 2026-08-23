/**
 * 矩形選択 (ラバーバンド) の判定。docs/GEOMETRY.md#選択判定 の 3 段構え。
 *
 * 1. AABB 判定    — 回転していないキーはこれだけで確定
 * 2. 包含円判定    — 回転しているキーを、円と選択範囲の交差でまず落とす
 * 3. SAT (分離軸判定) — 円判定を通ったものだけ、多角形同士の正確な交差を判定する
 */
import type { KeyModel } from '@/core/model/types';
import { doPolygonsIntersect, isPolygonInsideConvex } from './sat';
import { aabbOfKey, absoluteOutlineOf, boundingRadiusOf, type AABB } from './shape';
import { rotationCenterOf } from './rect';

export type SelectionMode = 'intersect' | 'contain';

function aabbOverlaps(a: AABB, b: AABB): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

function aabbContains(outer: AABB, inner: AABB): boolean {
  return inner.minX >= outer.minX && inner.maxX <= outer.maxX && inner.minY >= outer.minY && inner.maxY <= outer.maxY;
}

function circleMayIntersect(center: { x: number; y: number }, radius: number, rect: AABB): boolean {
  const clampedX = Math.min(Math.max(center.x, rect.minX), rect.maxX);
  const clampedY = Math.min(Math.max(center.y, rect.minY), rect.maxY);
  const dx = center.x - clampedX;
  const dy = center.y - clampedY;
  return dx * dx + dy * dy <= radius * radius;
}

function circleMayBeContained(center: { x: number; y: number }, radius: number, rect: AABB): boolean {
  return (
    center.x - radius >= rect.minX &&
    center.x + radius <= rect.maxX &&
    center.y - radius >= rect.minY &&
    center.y + radius <= rect.maxY
  );
}

function rectPolygon(rect: AABB): { x: number; y: number }[] {
  return [
    { x: rect.minX, y: rect.minY },
    { x: rect.maxX, y: rect.minY },
    { x: rect.maxX, y: rect.maxY },
    { x: rect.minX, y: rect.maxY },
  ];
}

/**
 * 選択範囲 (レイアウト座標 U) と交差 (または内包) するキーの id を返す。
 * mode: 'intersect' (既定、少しでも重なれば選択) / 'contain' (キー全体が範囲に入るときのみ)。
 */
export function keysIntersectingRect(
  keys: readonly KeyModel[],
  rect: AABB,
  mode: SelectionMode = 'intersect',
): string[] {
  const result: string[] = [];
  const rectPoly = rectPolygon(rect);

  for (const key of keys) {
    if (key.rotation.angle === 0) {
      // 回転していないキーは AABB 判定だけで確定する (isoEnter 等、副矩形で
      // 主矩形からはみ出す形状があるため、輪郭ベースの AABB を使う)。
      const keyAABB = aabbOfKey(key);
      const passes = mode === 'contain' ? aabbContains(rect, keyAABB) : aabbOverlaps(rect, keyAABB);
      if (passes) result.push(key.id);
      continue;
    }

    const center = rotationCenterOf(key);
    const radius = boundingRadiusOf(key);
    const circlePasses = mode === 'contain' ? circleMayBeContained(center, radius, rect) : circleMayIntersect(center, radius, rect);
    if (!circlePasses) continue;

    const polygon = absoluteOutlineOf(key);
    const passes = mode === 'contain' ? isPolygonInsideConvex(polygon, rectPoly) : doPolygonsIntersect(polygon, rectPoly);
    if (passes) result.push(key.id);
  }

  return result;
}
