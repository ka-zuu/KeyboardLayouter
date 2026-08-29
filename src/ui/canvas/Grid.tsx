/**
 * キャンバスのグリッド。1U ごとに細線、5U ごとに太線、原点に十字の目印。
 * docs/UI_SPEC.md#表示。
 *
 * ビューポートに映っている範囲だけを描画する (`scene.visible` に基づく)。
 * 線は `vector-effect="non-scaling-stroke"` でズームしても太さが一定になる。
 */
import type { AABB } from '@/core/geometry/shape';

interface GridProps {
  visible: AABB;
  showMinor: boolean;
}

function range(min: number, max: number, step: number): number[] {
  if (max < min) return [];
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + 1e-9; v += step) {
    out.push(Math.round(v * 1e6) / 1e6);
  }
  return out;
}

function Grid({ visible, showMinor }: GridProps) {
  const minorXs = showMinor ? range(visible.minX, visible.maxX, 1) : [];
  const minorYs = showMinor ? range(visible.minY, visible.maxY, 1) : [];
  const majorXs = range(visible.minX, visible.maxX, 5);
  const majorYs = range(visible.minY, visible.maxY, 5);

  return (
    <g className="kl-grid" data-testid="canvas-grid" aria-hidden="true">
      {minorXs.map((x) => (
        <line key={`minor-x-${x}`} className="kl-grid-line" x1={x} y1={visible.minY} x2={x} y2={visible.maxY} vectorEffect="non-scaling-stroke" />
      ))}
      {minorYs.map((y) => (
        <line key={`minor-y-${y}`} className="kl-grid-line" x1={visible.minX} y1={y} x2={visible.maxX} y2={y} vectorEffect="non-scaling-stroke" />
      ))}
      {majorXs.map((x) => (
        <line
          key={`major-x-${x}`}
          className="kl-grid-line-major"
          x1={x}
          y1={visible.minY}
          x2={x}
          y2={visible.maxY}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {majorYs.map((y) => (
        <line
          key={`major-y-${y}`}
          className="kl-grid-line-major"
          x1={visible.minX}
          y1={y}
          x2={visible.maxX}
          y2={y}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <g className="kl-origin-mark" data-testid="canvas-origin">
        <line x1={-0.3} y1={0} x2={0.3} y2={0} vectorEffect="non-scaling-stroke" />
        <line x1={0} y1={-0.3} x2={0} y2={0.3} vectorEffect="non-scaling-stroke" />
      </g>
    </g>
  );
}

export default Grid;
