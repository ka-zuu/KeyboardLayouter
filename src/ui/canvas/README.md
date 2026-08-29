レイアウトのレンダラ (SVG 実装) と描画インタフェース。

| ファイル | 内容 |
|---|---|
| `scene.ts` | `RenderScene`: 描画に必要な情報だけを持つ平坦な構造への射影。ビューポートカリングと LOD (`scale < 0.4` で刻印・1U グリッド線を省略) をここで行う |
| `svgPath.ts` | キー輪郭 (`core/geometry/shape.ts` の `outlineOf`) → SVG `<path>` の `d` 文字列 |
| `Grid.tsx` | 1U 細線 / 5U 太線 / 原点の十字マーカー |
| `KeyItem.tsx` | キー 1 個 = `<g>` 1 つ。回転・刻印 12 スロット・マトリクス番号・decal / ghost の表示 |
| `SelectionOverlay.tsx` | 選択範囲のバウンディングボックスと回転ハンドルの描画 (操作は M2-3) |
| `SvgLayoutRenderer.tsx` | 上記を束ねる。`docs/adr/0002-rendering.md` の `LayoutRenderer` 相当の責務をここに閉じ込め、`CanvasArea` からは `RenderScene` だけを渡す |
| `CanvasArea.tsx` | ストアの購読とビューポート操作 (`ui/hooks/useViewport.ts`) の配線 |

ワールド座標 (U) → 画面座標 (px) の変換は、ルートの `<g>` に載せる
1 つの `transform="translate(panPx) scale(pxPerU)"` だけで行う
(`core/geometry/units.ts` の `uToPx` と同じ値)。
