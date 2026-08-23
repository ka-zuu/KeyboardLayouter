/**
 * 分離軸判定 (Separating Axis Theorem)。legacy/v1 の lib/geometry.ts
 * (`doPolygonsIntersect`) から移植。挙動は変えず、`noUncheckedIndexedAccess`
 * 下で自然に書ける形に整理してある。
 */
import type { PointU } from '@/core/model/types';

function projectExtent(polygon: readonly PointU[], axis: PointU): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const p of polygon) {
    const projected = axis.x * p.x + axis.y * p.y;
    if (projected < min) min = projected;
    if (projected > max) max = projected;
  }
  return { min, max };
}

function hasSeparatingAxisFor(polygon: readonly PointU[], a: readonly PointU[], b: readonly PointU[]): boolean {
  for (let j = 0; j < polygon.length; j++) {
    const p1 = polygon[j];
    const p2 = polygon[(j + 1) % polygon.length];
    if (!p1 || !p2) continue;

    // 辺の法線 (辺ベクトルを 90° 回転させたもの) を分離軸候補にする。
    const axis = { x: p2.y - p1.y, y: p1.x - p2.x };
    const extentA = projectExtent(a, axis);
    const extentB = projectExtent(b, axis);
    if (extentA.max < extentB.min || extentB.max < extentA.min) return true;
  }
  return false;
}

/**
 * 2 つの凸多角形が交差するか (分離軸判定)。
 * 両者の辺から作れる法線をすべて分離軸候補として試し、
 * 1 つでも「射影が重ならない軸」が見つかれば交差しない。
 */
export function doPolygonsIntersect(polygonA: readonly PointU[], polygonB: readonly PointU[]): boolean {
  if (hasSeparatingAxisFor(polygonA, polygonA, polygonB)) return false;
  if (hasSeparatingAxisFor(polygonB, polygonA, polygonB)) return false;
  return true;
}

/** polygon (a) が rect の 4 頂点 (b, 凸多角形) に完全に含まれるか。 */
export function isPolygonInsideConvex(inner: readonly PointU[], outer: readonly PointU[]): boolean {
  for (let j = 0; j < outer.length; j++) {
    const p1 = outer[j];
    const p2 = outer[(j + 1) % outer.length];
    if (!p1 || !p2) continue;
    const axis = { x: p2.y - p1.y, y: p1.x - p2.x };
    const extentOuter = projectExtent(outer, axis);
    const extentInner = projectExtent(inner, axis);
    // inner の射影が outer の射影区間の外にはみ出していれば、内包していない。
    if (extentInner.min < extentOuter.min - 1e-9 || extentInner.max > extentOuter.max + 1e-9) {
      return false;
    }
  }
  return true;
}
