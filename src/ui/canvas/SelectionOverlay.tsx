/**
 * 選択範囲のバウンディングボックスと回転ハンドル。docs/UI_SPEC.md#表示。
 *
 * 個々のキーの輪郭強調は `KeyItem.tsx` の `.kl-key--selected` が担う。
 * ここは選択範囲全体の枠と回転ハンドルを描画し、`ui/hooks/useCanvasInteraction.ts`
 * がドラッグでの回転操作を配線する。
 */
import type { AABB } from '@/core/geometry/shape';

interface SelectionOverlayProps {
  box: AABB | null;
}

/** 回転ハンドルをバウンディングボックスの上端から離す距離 (U)。 */
const HANDLE_OFFSET_U = 0.5;
/** 見た目の半径 (U)。 */
const HANDLE_VISIBLE_RADIUS_U = 0.12;
/**
 * 実際の当たり判定に使う半径 (U)。低ズーム時に見た目 (0.12U) だけだと
 * つまみにくいため、見えない大きめの円を重ねてポインタを捉える。
 */
const HANDLE_HIT_RADIUS_U = 0.35;

function SelectionOverlay({ box }: SelectionOverlayProps) {
  if (!box) return null;

  const width = box.maxX - box.minX;
  const centerX = (box.minX + box.maxX) / 2;
  const handleY = box.minY - HANDLE_OFFSET_U;

  return (
    <g className="kl-selection" data-testid="selection-overlay">
      <rect
        className="kl-selection-box"
        x={box.minX}
        y={box.minY}
        width={width}
        height={box.maxY - box.minY}
        vectorEffect="non-scaling-stroke"
      />
      <line className="kl-selection-handle-stem" x1={centerX} y1={box.minY} x2={centerX} y2={handleY} vectorEffect="non-scaling-stroke" />
      <g data-testid="rotate-handle">
        <circle className="kl-selection-handle-hit" cx={centerX} cy={handleY} r={HANDLE_HIT_RADIUS_U} />
        <circle
          className="kl-selection-handle"
          cx={centerX}
          cy={handleY}
          r={HANDLE_VISIBLE_RADIUS_U}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </g>
  );
}

export default SelectionOverlay;
