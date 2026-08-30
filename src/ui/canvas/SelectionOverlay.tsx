/**
 * 選択範囲のバウンディングボックスと回転ハンドル。docs/UI_SPEC.md#表示。
 *
 * 個々のキーの輪郭強調は `KeyItem.tsx` の `.kl-key--selected` が担う。
 * ここは選択範囲全体の枠と回転ハンドルの**描画のみ**を行う
 * (ドラッグでの移動・回転はツール操作とあわせて M2-3 で実装する)。
 */
import type { AABB } from '@/core/geometry/shape';

interface SelectionOverlayProps {
  box: AABB | null;
}

/** 回転ハンドルをバウンディングボックスの上端から離す距離 (U)。 */
const HANDLE_OFFSET_U = 0.5;

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
      <circle
        className="kl-selection-handle"
        data-testid="rotate-handle"
        cx={centerX}
        cy={handleY}
        r={0.12}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export default SelectionOverlay;
