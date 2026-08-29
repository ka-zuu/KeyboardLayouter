/**
 * キー形状の輪郭。主矩形と副矩形の幾何和 (rectilinear union) として求める。
 *
 * docs/GEOMETRY.md#キー形状の輪郭 の ISO Enter の 6 点パス
 * ((0,0)→(1.5,0)→(1.5,2)→(0.25,2)→(0.25,1)→(0,1)→閉じる) は、
 * 主矩形 (0,0,1.5,1) と副矩形 (0.25,1,1.25,1) の幾何和として
 * ここで計算した結果と一致する (tests/unit/core/geometry/shape.test.ts で検証)。
 *
 * steppedCaps の副矩形は主矩形に完全に含まれるため、和を取ると主矩形と
 * 同じ 4 頂点になる。これは意図どおりで、steppedCaps の副矩形は
 * 「刻み線をどこに描くか」という描画用の情報であり、当たり判定の
 * 形状を変えるものではない。
 */
import type { KeyModel, PointU } from '@/core/model/types';
import { precalcTrig, rotatePointPrecalc, rotationCenterOf } from './rect';

interface RectXYWH {
  x: number;
  y: number;
  w: number;
  h: number;
}

function pointInRect(x: number, y: number, r: RectXYWH): boolean {
  return x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;
}

function keyOf(p: PointU): string {
  // 浮動小数の誤差を吸収するため、十分細かい精度に丸めてから比較する。
  return `${Math.round(p.x * 1e6)},${Math.round(p.y * 1e6)}`;
}

/** 2 つの軸並行矩形の幾何和を、単純な (穴の無い) 多角形として返す。 */
function unionOfTwoRects(primary: RectXYWH, secondary: RectXYWH): PointU[] {
  const xs = Array.from(new Set([primary.x, primary.x + primary.w, secondary.x, secondary.x + secondary.w])).sort(
    (a, b) => a - b,
  );
  const ys = Array.from(new Set([primary.y, primary.y + primary.h, secondary.y, secondary.y + secondary.h])).sort(
    (a, b) => a - b,
  );

  const nx = xs.length - 1;
  const ny = ys.length - 1;
  if (nx < 1 || ny < 1) {
    // 副矩形が退化している (幅か高さが 0) 場合は主矩形をそのまま返す。
    return [
      { x: primary.x, y: primary.y },
      { x: primary.x + primary.w, y: primary.y },
      { x: primary.x + primary.w, y: primary.y + primary.h },
      { x: primary.x, y: primary.y + primary.h },
    ];
  }

  const covered = (i: number, j: number): boolean => {
    if (i < 0 || j < 0 || i >= nx || j >= ny) return false;
    const midX = (xs[i]! + xs[i + 1]!) / 2;
    const midY = (ys[j]! + ys[j + 1]!) / 2;
    return pointInRect(midX, midY, primary) || pointInRect(midX, midY, secondary);
  };

  // 被覆セルの境界にある辺だけを集める (無向グラフとして)。
  const adjacency = new Map<string, PointU[]>();
  const pointByKey = new Map<string, PointU>();
  const addEdge = (a: PointU, b: PointU): void => {
    const ka = keyOf(a);
    const kb = keyOf(b);
    pointByKey.set(ka, a);
    pointByKey.set(kb, b);
    (adjacency.get(ka) ?? adjacency.set(ka, []).get(ka)!).push(b);
    (adjacency.get(kb) ?? adjacency.set(kb, []).get(kb)!).push(a);
  };

  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      if (!covered(i, j)) continue;
      const x0 = xs[i]!;
      const x1 = xs[i + 1]!;
      const y0 = ys[j]!;
      const y1 = ys[j + 1]!;
      if (!covered(i, j - 1)) addEdge({ x: x0, y: y0 }, { x: x1, y: y0 }); // top
      if (!covered(i, j + 1)) addEdge({ x: x0, y: y1 }, { x: x1, y: y1 }); // bottom
      if (!covered(i - 1, j)) addEdge({ x: x0, y: y0 }, { x: x0, y: y1 }); // left
      if (!covered(i + 1, j)) addEdge({ x: x1, y: y0 }, { x: x1, y: y1 }); // right
    }
  }

  if (adjacency.size === 0) {
    return [
      { x: primary.x, y: primary.y },
      { x: primary.x + primary.w, y: primary.y },
      { x: primary.x + primary.w, y: primary.y + primary.h },
      { x: primary.x, y: primary.y + primary.h },
    ];
  }

  // 境界を 1 周だけ辿る (主矩形と副矩形が重なって単純連結領域を作る前提)。
  const startKey = adjacency.keys().next().value as string;
  const ordered: PointU[] = [pointByKey.get(startKey)!];
  let prevKey = '';
  let currentKey = startKey;
  for (let guard = 0; guard < 64; guard++) {
    const neighbors = adjacency.get(currentKey);
    if (!neighbors) break;
    const next = neighbors.find((p) => keyOf(p) !== prevKey);
    if (!next) break;
    const nextKey = keyOf(next);
    if (nextKey === startKey) break;
    ordered.push(next);
    prevKey = currentKey;
    currentKey = nextKey;
  }

  // 直線上に並ぶだけの中間点 (グリッド分割の副作用) を取り除く。
  const n = ordered.length;
  return ordered.filter((cur, i) => {
    const prev = ordered[(i - 1 + n) % n]!;
    const next = ordered[(i + 1) % n]!;
    const collinear = (prev.x === cur.x && cur.x === next.x) || (prev.y === cur.y && cur.y === next.y);
    return !collinear;
  });
}

/**
 * キーの輪郭。キー左上 (position) を原点とした相対座標 (回転前)。
 * shape が 'custom' のときは polygon をそのまま使う。
 */
export function outlineOf(key: Pick<KeyModel, 'shape' | 'size' | 'secondary' | 'polygon'>): PointU[] {
  if (key.shape === 'custom') {
    return key.polygon ?? [];
  }
  const primary: RectXYWH = { x: 0, y: 0, w: key.size.w, h: key.size.h };
  if (key.shape === 'rect' || key.secondary === null) {
    return [
      { x: primary.x, y: primary.y },
      { x: primary.x + primary.w, y: primary.y },
      { x: primary.x + primary.w, y: primary.y + primary.h },
      { x: primary.x, y: primary.y + primary.h },
    ];
  }
  return unionOfTwoRects(primary, key.secondary);
}

/** キーの輪郭を絶対座標 (回転を適用済み) で返す。 */
export function absoluteOutlineOf(key: KeyModel): PointU[] {
  const local = outlineOf(key);
  const abs = local.map((p) => ({ x: p.x + key.position.x, y: p.y + key.position.y }));
  if (key.rotation.angle === 0) return abs;
  const center = rotationCenterOf(key);
  const { sin, cos } = precalcTrig(key.rotation.angle);
  return abs.map((p) => rotatePointPrecalc(p, center, sin, cos));
}

/** 選択判定の包含円判定に使う半径 (回転中心から輪郭上の最遠点までの距離)。 */
export function boundingRadiusOf(key: KeyModel): number {
  const outline = outlineOf(key);
  const center = rotationCenterOf(key);
  const centerLocal = { x: center.x - key.position.x, y: center.y - key.position.y };
  let maxDistSq = 0;
  for (const p of outline) {
    const dx = p.x - centerLocal.x;
    const dy = p.y - centerLocal.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > maxDistSq) maxDistSq = distSq;
  }
  return Math.sqrt(maxDistSq);
}

export interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** 1 キーの絶対座標での AABB (形状・回転を考慮)。 */
export function aabbOfKey(key: KeyModel): AABB {
  const points = absoluteOutlineOf(key);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

/** 複数キーの AABB (和)。キーが 0 件のときは null。 */
export function aabbOfKeys(keys: readonly KeyModel[]): AABB | null {
  if (keys.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const key of keys) {
    const box = aabbOfKey(key);
    if (box.minX < minX) minX = box.minX;
    if (box.maxX > maxX) maxX = box.maxX;
    if (box.minY < minY) minY = box.minY;
    if (box.maxY > maxY) maxY = box.maxY;
  }
  return { minX, maxX, minY, maxY };
}
