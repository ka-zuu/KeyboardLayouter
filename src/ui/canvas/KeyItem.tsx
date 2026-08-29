/**
 * キー 1 個 = `<g>` 1 つ。docs/adr/0002-rendering.md / docs/UI_SPEC.md#表示。
 *
 * - 角丸矩形 + 内側の凸面。刻印は 12 スロットに配置
 * - 回転は `transform="rotate(angle cx cy)"` (中心は `scene.ts` が計算した localCenter)
 * - `decal` は点線の輪郭、`ghost` は半透明
 * - マトリクス番号の重ね表示 (`showMatrix`)
 */
import type { LegendSlot } from '@/core/model/types';
import type { RenderKey } from './scene';

interface KeyItemProps {
  entry: RenderKey;
  selected: boolean;
  showLegends: boolean;
  showMatrix: boolean;
}

/** 12 スロットの相対位置 (キーの w/h に対する比率)。docs/UI_SPEC.md#単一選択-キープロパティ。 */
const LEGEND_SLOTS: Record<LegendSlot, { fx: number; fy: number; anchor: 'start' | 'middle' | 'end' }> = {
  topLeft: { fx: 0.14, fy: 0.2, anchor: 'start' },
  topCenter: { fx: 0.5, fy: 0.2, anchor: 'middle' },
  topRight: { fx: 0.86, fy: 0.2, anchor: 'end' },
  centerLeft: { fx: 0.14, fy: 0.5, anchor: 'start' },
  center: { fx: 0.5, fy: 0.5, anchor: 'middle' },
  centerRight: { fx: 0.86, fy: 0.5, anchor: 'end' },
  bottomLeft: { fx: 0.14, fy: 0.72, anchor: 'start' },
  bottomCenter: { fx: 0.5, fy: 0.72, anchor: 'middle' },
  bottomRight: { fx: 0.86, fy: 0.72, anchor: 'end' },
  frontLeft: { fx: 0.14, fy: 0.92, anchor: 'start' },
  frontCenter: { fx: 0.5, fy: 0.92, anchor: 'middle' },
  frontRight: { fx: 0.86, fy: 0.92, anchor: 'end' },
};

const LEGEND_FONT_SIZE_U = 0.16;
const MATRIX_FONT_SIZE_U = 0.14;
const FACE_INSET_U = 0.08;

function KeyItem({ entry, selected, showLegends, showMatrix }: KeyItemProps) {
  const { key, path, localCenter } = entry;
  const transform =
    key.rotation.angle !== 0
      ? `translate(${key.position.x.toString()} ${key.position.y.toString()}) rotate(${key.rotation.angle.toString()} ${localCenter.x.toString()} ${localCenter.y.toString()})`
      : `translate(${key.position.x.toString()} ${key.position.y.toString()})`;

  const classNames = [
    'kl-key',
    key.decal && 'kl-key--decal',
    key.ghost && 'kl-key--ghost',
    selected && 'kl-key--selected',
  ]
    .filter(Boolean)
    .join(' ');

  const legendEntries = showLegends ? (Object.entries(key.legends) as [LegendSlot, string][]) : [];

  return (
    <g
      className={classNames}
      transform={transform}
      data-testid={`key-${key.id}`}
      data-matrix={key.matrix ? `${key.matrix.row.toString()},${key.matrix.col.toString()}` : undefined}
    >
      <path
        className="kl-key-face"
        d={path}
        style={key.color ? { fill: key.color } : undefined}
        vectorEffect="non-scaling-stroke"
      />
      <rect
        className="kl-key-face-inner"
        x={FACE_INSET_U}
        y={FACE_INSET_U}
        width={Math.max(key.size.w - FACE_INSET_U * 2, 0)}
        height={Math.max(key.size.h - FACE_INSET_U * 2, 0)}
        rx={0.06}
        vectorEffect="non-scaling-stroke"
      />
      {legendEntries.map(([slot, text]) => {
        const pos = LEGEND_SLOTS[slot];
        return (
          <text
            key={slot}
            className="kl-key-legend"
            x={key.size.w * pos.fx}
            y={key.size.h * pos.fy}
            fontSize={LEGEND_FONT_SIZE_U}
            textAnchor={pos.anchor}
            dominantBaseline="middle"
            style={key.legendColor ? { fill: key.legendColor } : undefined}
          >
            {text}
          </text>
        );
      })}
      {showMatrix && key.matrix && (
        <text
          className="kl-key-matrix"
          x={key.size.w / 2}
          y={key.size.h / 2}
          fontSize={MATRIX_FONT_SIZE_U}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {`${key.matrix.row.toString()},${key.matrix.col.toString()}`}
        </text>
      )}
    </g>
  );
}

export default KeyItem;
