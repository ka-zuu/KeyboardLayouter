import { useEditorStore } from '@/state/appState';
import './inspector/inspector.css';
import './left/leftPanel.css';
import PresetPalette from './left/PresetPalette';
import ProjectList from './left/ProjectList';

/** docs/UI_SPEC.md#左パネル (キー追加プリセット / プロジェクト一覧)。折りたたみ中は描画しない。 */
function LeftPanel() {
  const collapsed = useEditorStore((s) => s.leftPanelCollapsed);
  if (collapsed) return null;
  return (
    <aside
      data-testid="left-panel"
      className="kl-left-panel"
      style={{
        width: 'var(--panel-left-w)',
        flexShrink: 0,
        background: 'var(--bg-panel)',
        borderRight: '1px solid var(--border)',
        overflowY: 'auto',
      }}
    >
      <PresetPalette />
      <ProjectList />
    </aside>
  );
}

export default LeftPanel;
