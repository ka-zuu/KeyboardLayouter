/**
 * 回転矩形の頂点 / AABB / 点の回転。
 *
 * legacy/v1 の lib/geometry.ts から移植。sin/cos を呼び出し側で事前計算して
 * 渡せる形になっており、多数のキーを扱うループでの三角関数呼び出しを
 * 削減できる (docs/ARCHITECTURE.md#旧アプリから引き継ぐ実装)。
 */
import type { KeyModel, PointU } from '@/core/model/types';

export interface TrigPrecalc {
  sin: number;
  cos: number;
}

/** 角度 (度) から sin/cos を事前計算する。 */
export function precalcTrig(angleDeg: number): TrigPrecalc {
  const rad = (angleDeg * Math.PI) / 180;
  return { sin: Math.sin(rad), cos: Math.cos(rad) };
}

/** 点を中心の周りに回転させる (度単位)。 */
export function rotatePoint(point: PointU, center: PointU, angleDeg: number): PointU {
  const { sin, cos } = precalcTrig(angleDeg);
  return rotatePointPrecalc(point, center, sin, cos);
}

/** 事前計算した sin/cos で点を回転させる。 */
export function rotatePointPrecalc(point: PointU, center: PointU, sin: number, cos: number): PointU {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + (dx * cos - dy * sin),
    y: center.y + (dx * sin + dy * cos),
  };
}

/**
 * 回転後の矩形の 4 頂点。angle === 0 のときは早期に非回転の頂点を返す。
 * cx / cy は左上 (x, y) からの相対オフセット (回転中心)。
 */
export function getRotatedRectPoints(
  x: number,
  y: number,
  w: number,
  h: number,
  angleDeg: number,
  cx = 0,
  cy = 0,
  precalc?: TrigPrecalc,
): PointU[] {
  if (angleDeg === 0) {
    return [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ];
  }

  const center = { x: x + cx, y: y + cy };
  const { sin, cos } = precalc ?? precalcTrig(angleDeg);

  return [
    rotatePointPrecalc({ x, y }, center, sin, cos),
    rotatePointPrecalc({ x: x + w, y }, center, sin, cos),
    rotatePointPrecalc({ x: x + w, y: y + h }, center, sin, cos),
    rotatePointPrecalc({ x, y: y + h }, center, sin, cos),
  ];
}

/** 4 頂点を作らずに AABB を求める (各項の極値から算出)。 */
export function getRotatedRectAABB(
  x: number,
  y: number,
  w: number,
  h: number,
  angleDeg: number,
  cx = 0,
  cy = 0,
  precalc?: TrigPrecalc,
): { minX: number; maxX: number; minY: number; maxY: number } {
  if (angleDeg === 0) {
    return { minX: x, maxX: x + w, minY: y, maxY: y + h };
  }

  const centerX = x + cx;
  const centerY = y + cy;
  const { sin, cos } = precalc ?? precalcTrig(angleDeg);

  // 回転中心から見た相対座標の範囲
  const xMinRel = -cx;
  const xMaxRel = w - cx;
  const yMinRel = -cy;
  const yMaxRel = h - cy;

  // x' = x*cos - y*sin + centerX
  const xTerm1a = xMinRel * cos;
  const xTerm1b = xMaxRel * cos;
  const xTerm2a = -yMinRel * sin;
  const xTerm2b = -yMaxRel * sin;
  const minX = Math.min(xTerm1a, xTerm1b) + Math.min(xTerm2a, xTerm2b) + centerX;
  const maxX = Math.max(xTerm1a, xTerm1b) + Math.max(xTerm2a, xTerm2b) + centerX;

  // y' = x*sin + y*cos + centerY
  const yTerm1a = xMinRel * sin;
  const yTerm1b = xMaxRel * sin;
  const yTerm2a = yMinRel * cos;
  const yTerm2b = yMaxRel * cos;
  const minY = Math.min(yTerm1a, yTerm1b) + Math.min(yTerm2a, yTerm2b) + centerY;
  const maxY = Math.max(yTerm1a, yTerm1b) + Math.max(yTerm2a, yTerm2b) + centerY;

  return { minX, maxX, minY, maxY };
}

/**
 * キーの回転中心 (絶対座標)。
 * origin が非 null ならそれをそのまま使い、null なら幾何中心を軸にする。
 */
export function rotationCenterOf(key: Pick<KeyModel, 'position' | 'size' | 'rotation'>): PointU {
  if (key.rotation.origin !== null) return key.rotation.origin;
  return {
    x: key.position.x + key.size.w / 2,
    y: key.position.y + key.size.h / 2,
  };
}
