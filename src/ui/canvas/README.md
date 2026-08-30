レイアウトのレンダラ (SVG 実装) と描画インタフェース。

| ファイル | 内容 |
|---|---|
| `scene.ts` | `RenderScene`: 描画に必要な情報だけを持つ平坦な構造への射影。ビューポートカリングと LOD (`scale < 0.4` で刻印・1U グリッド線を省略) をここで行う。`RenderKey` は `WeakMap<KeyModel, RenderKey>` でキャッシュし、動いていないキーの参照を安定させる (`KeyItem` の `React.memo` を効かせるため) |
| `svgPath.ts` | キー輪郭 (`core/geometry/shape.ts` の `outlineOf`) → SVG `<path>` の `d` 文字列 |
| `Grid.tsx` | 1U 細線 / 5U 太線 / 原点の十字マーカー |
| `KeyItem.tsx` | キー 1 個 = `<g>` 1 つ (`React.memo`)。回転・刻印 12 スロット・マトリクス番号・decal / ghost の表示。`data-key-id` で `ui/hooks/useCanvasInteraction.ts` がヒットテストする |
| `SelectionOverlay.tsx` | 選択範囲のバウンディングボックスと回転ハンドルの描画。ドラッグでの回転操作は `ui/hooks/useCanvasInteraction.ts` が配線する |
| `RubberBand.tsx` | 矩形選択 (ラバーバンド) 中の選択範囲の見た目。ドラッグ中はストアを更新せず、ここの描画だけを行う |
| `SvgLayoutRenderer.tsx` | 上記を束ねる。`docs/adr/0002-rendering.md` の `LayoutRenderer` 相当の責務をここに閉じ込め、`CanvasArea` からは `RenderScene` だけを渡す |
| `CanvasArea.tsx` | ストアの購読とビューポート操作 (`ui/hooks/useViewport.ts`)・キャンバス操作 (`ui/hooks/useCanvasInteraction.ts`) の配線 |

ワールド座標 (U) → 画面座標 (px) の変換は、ルートの `<g>` に載せる
1 つの `transform="translate(panPx) scale(pxPerU)"` だけで行う
(`core/geometry/units.ts` の `uToPx` と同じ値)。
