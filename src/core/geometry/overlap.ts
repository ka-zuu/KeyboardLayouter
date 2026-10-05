/**
 * キー同士の重なり判定。docs/GEOMETRY.md#キー同士の重なり。
 *
 * ステータスバーの「重なっています」表示 (docs/UI_SPEC.md#キーの重なり) に使う。
 * 選択判定の `doPolygonsIntersect` は境界の接触も交差と見なすため、隣接して並んだ
 * キー (辺を共有する) まで重なり扱いになってしまう。ここでは `OVERLAP_EPSILON_U`
 * より深く食い込んでいる場合だけを重なりとする。
 *
 * ISO Enter 等の輪郭 (`outlineOf`) は凹多角形で SAT がそのまま使えないため、
 * 主矩形と副矩形をそれぞれ凸な部品として回転させ、部品同士で判定する。
 */
import type { KeyModel, PointU } from '@/core/model/types';
import { precalcTrig, rotatePointPrecalc, rotationCenterOf } from './rect';
import { aabbOfKey, type AABB } from './shape';

/** これより浅い食い込みは重なりと見なさない (U)。0.05U グリッドより十分小さい値。 */
export const OVERLAP_EPSILON_U = 1e-3;

function rectPoints(x: number, y: number, w: number, h: number): PointU[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

/** キーを凸な部品 (絶対座標、回転適用済み) に分ける。 */
function convexPartsOf(key: KeyModel): PointU[][] {
  let parts: PointU[][];
  if (key.shape === 'custom') {
    // custom は凸多角形を前提とする (docs/DATA_MODEL.md の polygon)。
    parts = [key.polygon ?? []];
  } else {
    parts = [rectPoints(0, 0, key.size.w, key.size.h)];
    if (key.shape !== 'rect' && key.secondary) {
      const s = key.secondary;
      parts.push(rectPoints(s.x, s.y, s.w, s.h));
    }
  }

  const center = rotationCenterOf(key);
  const { sin, cos } = precalcTrig(key.rotation.angle);
  return parts.map((part) =>
    part.map((p) => {
      const abs = { x: p.x + key.position.x, y: p.y + key.position.y };
      return key.rotation.angle === 0 ? abs : rotatePointPrecalc(abs, center, sin, cos);
    }),
  );
}

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

/** `edges` の辺の法線のうち、a と b の射影の重なりが ε 以下になる軸があるか。 */
function hasSeparatingAxis(edges: readonly PointU[], a: readonly PointU[], b: readonly PointU[]): boolean {
  for (let j = 0; j < edges.length; j++) {
    const p1 = edges[j]!;
    const p2 = edges[(j + 1) % edges.length]!;
    const length = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (length === 0) continue;
    // 単位法線にして、射影の長さを U のまま ε と比べられるようにする。
    const axis = { x: (p2.y - p1.y) / length, y: (p1.x - p2.x) / length };
    const extentA = projectExtent(a, axis);
    const extentB = projectExtent(b, axis);
    if (Math.min(extentA.max, extentB.max) - Math.max(extentA.min, extentB.min) <= OVERLAP_EPSILON_U) return true;
  }
  return false;
}

function convexPolygonsOverlap(a: readonly PointU[], b: readonly PointU[]): boolean {
  if (a.length < 3 || b.length < 3) return false;
  return !hasSeparatingAxis(a, a, b) && !hasSeparatingAxis(b, a, b);
}

function aabbsOverlap(a: AABB, b: AABB): boolean {
  return (
    Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) > OVERLAP_EPSILON_U &&
    Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY) > OVERLAP_EPSILON_U
  );
}

/** 2 つのキーが (接触ではなく) 重なっているか。形状と回転を考慮する。 */
export function doKeysOverlap(a: KeyModel, b: KeyModel): boolean {
  if (!aabbsOverlap(aabbOfKey(a), aabbOfKey(b))) return false;
  const partsA = convexPartsOf(a);
  const partsB = convexPartsOf(b);
  return partsA.some((pa) => partsB.some((pb) => convexPolygonsOverlap(pa, pb)));
}

/**
 * `targetIds` のキーのうち、他のキーと重なっているものの id を返す。
 * `targetIds` 同士の重なりも含む。AABB を X 方向に並べて掃引するので、
 * 1000 キーを全選択しても O(n log n + 候補ペア数) で済む (docs/TESTING.md#性能テスト)。
 */
export function overlappingKeyIds(keys: readonly KeyModel[], targetIds: readonly string[]): string[] {
  if (targetIds.length === 0 || keys.length < 2) return [];
  const targets = new Set(targetIds);
  const entries = keys.map((key) => ({ key, box: aabbOfKey(key) })).sort((p, q) => p.box.minX - q.box.minX);

  const result = new Set<string>();
  for (let i = 0; i < entries.length; i++) {
    const a = entries[i]!;
    for (let j = i + 1; j < entries.length; j++) {
      const b = entries[j]!;
      if (b.box.minX >= a.box.maxX - OVERLAP_EPSILON_U) break;
      const aTarget = targets.has(a.key.id);
      const bTarget = targets.has(b.key.id);
      if (!aTarget && !bTarget) continue;
      if (!aabbsOverlap(a.box, b.box) || !doKeysOverlap(a.key, b.key)) continue;
      if (aTarget) result.add(a.key.id);
      if (bTarget) result.add(b.key.id);
    }
  }
  return keys.filter((k) => result.has(k.id)).map((k) => k.id);
}
