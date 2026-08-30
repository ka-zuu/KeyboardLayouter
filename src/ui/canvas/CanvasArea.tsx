import { useMemo } from 'react';
import { useEditorStore, useProjectStore } from '@/state/appState';
import { selectionAABB } from '@/state/selectors';
import { useElementSize } from '@/ui/hooks/useElementSize';
import { useViewport } from '@/ui/hooks/useViewport';
import './canvas.css';
import { buildScene } from './scene';
import SvgLayoutRenderer from './SvgLayoutRenderer';

function CanvasArea() {
  const [containerRef, viewportPx] = useElementSize<HTMLDivElement>();
  useViewport(containerRef);

  const project = useProjectStore((s) => s.project);
  const scale = useEditorStore((s) => s.scale);
  const panPx = useEditorStore((s) => s.panPx);
  const selectedKeyIds = useEditorStore((s) => s.selectedKeyIds);
  const showMatrix = useEditorStore((s) => s.showMatrix);

  const scene = useMemo(
    () => buildScene(project, { scale, panPx, selectedKeyIds, showMatrix }, viewportPx),
    [project, scale, panPx, selectedKeyIds, showMatrix, viewportPx],
  );
  const selectionBox = useMemo(() => selectionAABB(project, selectedKeyIds), [project, selectedKeyIds]);

  return (
    <main ref={containerRef} className="kl-canvas-area" data-testid="canvas-area">
      <SvgLayoutRenderer scene={scene} viewportPx={viewportPx} selectionBox={selectionBox} />
    </main>
  );
}

export default CanvasArea;
