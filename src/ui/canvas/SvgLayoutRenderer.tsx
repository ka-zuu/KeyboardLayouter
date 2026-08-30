/**
 * `RenderScene` を SVG として描画する。docs/adr/0002-rendering.md の
 * `LayoutRenderer` 相当の責務をここに閉じ込め、`CanvasArea` からは
 * `RenderScene` だけを渡す (ストアの型を持ち込まない)。
 *
 * ワールド座標 (U) → 画面座標 (px) の変換は、ルートの `<g>` に載せる
 * 1 つの `transform="translate(panPx) scale(pxPerU)"` だけで行う。
 * 個々の要素の座標は U のまま書けるため、ズーム時に React が更新する
 * DOM は transform 属性の再計算だけで済む。
 */
import type { AABB } from '@/core/geometry/shape';
import type { ViewportSizePx } from '@/core/geometry/viewport';
import Grid from './Grid';
import KeyItem from './KeyItem';
import RubberBand, { type RubberBandState } from './RubberBand';
import SelectionOverlay from './SelectionOverlay';
import type { RenderScene } from './scene';

interface SvgLayoutRendererProps {
  scene: RenderScene;
  viewportPx: ViewportSizePx;
  selectionBox: AABB | null;
  rubberBand?: RubberBandState | null;
}

function SvgLayoutRenderer({ scene, viewportPx, selectionBox, rubberBand = null }: SvgLayoutRendererProps) {
  const transform = `translate(${scene.panPx.x.toString()} ${scene.panPx.y.toString()}) scale(${scene.pxPerU.toString()})`;

  return (
    <svg className="kl-canvas-svg" width={viewportPx.width} height={viewportPx.height} data-testid="canvas-svg">
      <g transform={transform}>
        <Grid visible={scene.visible} showMinor={scene.showMinorGrid} />
        {scene.keys.map((entry) => (
          <KeyItem
            key={entry.key.id}
            entry={entry}
            selected={scene.selectedKeyIds.has(entry.key.id)}
            showLegends={scene.showLegends}
            showMatrix={scene.showMatrix}
          />
        ))}
        <SelectionOverlay box={selectionBox} />
        <RubberBand box={rubberBand?.box ?? null} contain={rubberBand?.contain ?? false} />
      </g>
    </svg>
  );
}

export default SvgLayoutRenderer;
