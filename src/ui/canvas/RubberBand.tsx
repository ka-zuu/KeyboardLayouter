/**
 * 矩形選択 (ラバーバンド) 中の選択範囲の表示。docs/UI_SPEC.md#操作 の
 * 「ドラッグ (空白から) | 矩形選択 (交差選択)。Alt 併用で包含選択」。
 *
 * ドラッグ中はストアを一切更新せず (`ui/hooks/useCanvasInteraction.ts` 側の
 * ローカル state)、この矩形の描画だけを行う。判定 (どのキーが選択されるか) は
 * `pointerup` 時に 1 回だけ `core/geometry/select.ts` の `keysIntersectingRect`
 * で行う。
 */
import type { AABB } from '@/core/geometry/shape';

export interface RubberBandState {
  box: AABB;
  /** `true` (Alt 押下) なら包含選択。 */
  contain: boolean;
}

interface RubberBandProps {
  box: AABB | null;
  /** `true` (Alt 押下) なら包含選択であることを示す見た目にする。 */
  contain: boolean;
}

function RubberBand({ box, contain }: RubberBandProps) {
  if (!box) return null;

  return (
    <rect
      className={`kl-rubber-band${contain ? ' kl-rubber-band--contain' : ''}`}
      data-testid="rubber-band"
      x={box.minX}
      y={box.minY}
      width={box.maxX - box.minX}
      height={box.maxY - box.minY}
      vectorEffect="non-scaling-stroke"
    />
  );
}

export default RubberBand;
