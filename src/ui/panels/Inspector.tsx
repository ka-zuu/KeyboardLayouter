import { useEditorStore } from '@/state/appState';
import KeyInspector from './inspector/KeyInspector';
import './inspector/inspector.css';
import MultiKeyInspector from './inspector/MultiKeyInspector';
import ProjectInspector from './inspector/ProjectInspector';

function Inspector() {
  const selectedKeyIds = useEditorStore((s) => s.selectedKeyIds);

  return (
    <aside
      data-testid="inspector"
      style={{
        width: 'var(--panel-right-w)',
        flexShrink: 0,
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border)',
        overflowY: 'auto',
      }}
    >
      {selectedKeyIds.length === 0 && <ProjectInspector />}
      {selectedKeyIds.length === 1 && <KeyInspector keyId={selectedKeyIds[0]!} />}
      {selectedKeyIds.length > 1 && <MultiKeyInspector keyIds={selectedKeyIds} />}
    </aside>
  );
}

export default Inspector;
