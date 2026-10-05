/**
 * キャンバス上での主刻印の直接編集欄 (docs/UI_SPEC.md#操作 のダブルクリック)。
 *
 * SVG の中に `<foreignObject>` で入力欄を置くとズーム倍率に合わせて文字まで拡縮されるため、
 * キャンバスの上に HTML の入力欄を重ね、キーの見た目の中心 (回転適用済み) に合わせて置く。
 * `Enter` / フォーカスが外れたら確定、`Esc` で取り消し。
 * `data-canvas-overlay` は `useCanvasInteraction` がキャンバス操作から除外する目印。
 */
import { useEffect } from 'react';
import { rotatePoint, rotationCenterOf } from '@/core/geometry/rect';
import { layoutToScreen, uToPx } from '@/core/geometry/units';
import { primaryLegendSlotOf } from '@/core/model/key';
import { finishLegendEdit } from '@/state/actions';
import { useEditorStore, useProjectStore } from '@/state/appState';

const MIN_WIDTH_PX = 80;

function LegendEditor() {
  const keyId = useEditorStore((s) => s.editingLegendKeyId);
  const key = useProjectStore((s) => (keyId ? s.project.keys.find((k) => k.id === keyId) : undefined));
  const scale = useEditorStore((s) => s.scale);
  const panPx = useEditorStore((s) => s.panPx);

  // 編集中に Undo 等でキーが消えたら編集を終える。
  useEffect(() => {
    if (keyId && !key) finishLegendEdit(null);
  }, [keyId, key]);

  if (!keyId || !key) return null;

  const geometricCenter = { x: key.position.x + key.size.w / 2, y: key.position.y + key.size.h / 2 };
  const visualCenter = key.rotation.angle === 0 ? geometricCenter : rotatePoint(geometricCenter, rotationCenterOf(key), key.rotation.angle);
  const centerPx = layoutToScreen(visualCenter, scale, panPx);
  const widthPx = Math.max(uToPx(key.size.w, scale), MIN_WIDTH_PX);
  const slot = primaryLegendSlotOf(key);

  return (
    <div data-canvas-overlay className="kl-legend-editor" style={{ left: centerPx.x - widthPx / 2, top: centerPx.y, width: widthPx }}>
      <input
        // 対象キーが変わったら作り直し、その時点の刻印から始める (inspector/fields.tsx と同じ非制御入力の流儀)。
        key={keyId}
        className="kl-legend-editor-input"
        data-testid="canvas-legend-input"
        aria-label="主刻印"
        defaultValue={key.legends[slot] ?? ''}
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            finishLegendEdit(e.currentTarget.value);
          } else if (e.key === 'Escape') {
            // グローバルの Esc (選択解除) に流さない。
            e.stopPropagation();
            finishLegendEdit(null);
          }
        }}
        onBlur={(e) => finishLegendEdit(e.currentTarget.value)}
      />
    </div>
  );
}

export default LegendEditor;
