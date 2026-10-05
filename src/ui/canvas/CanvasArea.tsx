import { useEffect, useMemo } from 'react';
import { screenToLayout } from '@/core/geometry/units';
import { findPreset } from '@/core/model/presets';
import { addPresetKeys } from '@/state/actions';
import { useEditorStore, useProjectStore } from '@/state/appState';
import { selectionAABB } from '@/state/selectors';
import { useCanvasInteraction } from '@/ui/hooks/useCanvasInteraction';
import { useElementSize } from '@/ui/hooks/useElementSize';
import { useViewport } from '@/ui/hooks/useViewport';
import './canvas.css';
import LegendEditor from './LegendEditor';
import { buildScene } from './scene';
import SvgLayoutRenderer from './SvgLayoutRenderer';
import { PRESET_DRAG_MIME, type PresetDragPayload } from '@/ui/panels/left/presetDrag';

/** 左パネルのプリセットをドロップされた位置 (キー全体の中心) に追加する。 */
function handlePresetDrop(e: React.DragEvent<HTMLElement>): void {
  const raw = e.dataTransfer.getData(PRESET_DRAG_MIME);
  if (!raw) return;
  e.preventDefault();
  let payload: PresetDragPayload;
  try {
    payload = JSON.parse(raw) as PresetDragPayload;
  } catch {
    return;
  }
  const preset = findPreset(payload.id);
  if (!preset) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const { scale, panPx } = useEditorStore.getState();
  addPresetKeys(preset, payload.count, screenToLayout({ x: e.clientX - rect.left, y: e.clientY - rect.top }, scale, panPx));
}

function handlePresetDragOver(e: React.DragEvent<HTMLElement>): void {
  if (!e.dataTransfer.types.includes(PRESET_DRAG_MIME)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}

function CanvasArea() {
  const [containerRef, viewportPx] = useElementSize<HTMLDivElement>();
  useViewport(containerRef);
  const rubberBand = useCanvasInteraction(containerRef);

  const project = useProjectStore((s) => s.project);
  const scale = useEditorStore((s) => s.scale);
  const panPx = useEditorStore((s) => s.panPx);
  const selectedKeyIds = useEditorStore((s) => s.selectedKeyIds);
  const showMatrix = useEditorStore((s) => s.showMatrix);
  const activeTool = useEditorStore((s) => s.activeTool);
  const setViewportPx = useEditorStore((s) => s.setViewportPx);

  // Shift+1 (全体を表示) / Shift+2 (選択にズーム) がキャンバスの実寸を必要とするため、
  // サイズが変わるたびに editorStore へ反映する。
  useEffect(() => {
    setViewportPx(viewportPx);
  }, [viewportPx, setViewportPx]);

  const scene = useMemo(
    () => buildScene(project, { scale, panPx, selectedKeyIds, showMatrix }, viewportPx),
    [project, scale, panPx, selectedKeyIds, showMatrix, viewportPx],
  );
  const selectionBox = useMemo(() => selectionAABB(project, selectedKeyIds), [project, selectedKeyIds]);

  return (
    <main
      ref={containerRef}
      className="kl-canvas-area"
      data-testid="canvas-area"
      data-tool={activeTool}
      onDragOver={handlePresetDragOver}
      onDrop={handlePresetDrop}
    >
      <SvgLayoutRenderer scene={scene} viewportPx={viewportPx} selectionBox={selectionBox} rubberBand={rubberBand} />
      <LegendEditor />
    </main>
  );
}

export default CanvasArea;
