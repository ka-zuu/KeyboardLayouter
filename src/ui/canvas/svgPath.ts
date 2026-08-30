/**
 * キー輪郭 → SVG `<path>` の `d` 文字列。
 * 輪郭そのものの計算は `core/geometry/shape.ts` の `outlineOf` が担い、
 * ここでは文字列化だけを行う (docs/ARCHITECTURE.md#描画-キャンバス)。
 *
 * 座標はレイアウト単位 (U) のまま出力する。実際のピクセルへの変換は、
 * この `<path>` を含む `<g>` に載せる `scale(PX_PER_U * viewportScale)` の
 * SVG transform 側で行う (`SvgLayoutRenderer.tsx`)。1 点ずつ JS で
 * 座標変換しないことで、ズーム時に React が再計算・再描画する範囲を
 * transform 属性の更新だけに抑えられる。
 */
import type { PointU } from '@/core/model/types';
import { round4 } from '@/core/geometry/snap';

export function outlineToSvgPath(points: readonly PointU[]): string {
  if (points.length === 0) return '';
  const fmt = (n: number): string => round4(n).toString();

  const [first, ...rest] = points;
  const parts = [`M ${fmt(first!.x)} ${fmt(first!.y)}`, ...rest.map((p) => `L ${fmt(p.x)} ${fmt(p.y)}`), 'Z'];
  return parts.join(' ');
}
