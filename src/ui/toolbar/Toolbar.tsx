import { useEditorStore, useProjectStore } from '@/state/appState';
import type { ThemePreference } from '@/platform/storage/appStorage';
import type { ActiveTool } from '@/core/model/types';
import ExportMenu from './ExportMenu';
import ImportButton from './ImportButton';
import ProjectControls from './ProjectControls';
import './toolbar.css';
import ZoomControls from './ZoomControls';

const THEME_CYCLE: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

const THEME_LABEL: Record<ThemePreference, string> = {
  system: 'システム',
  light: 'ライト',
  dark: 'ダーク',
};

/** docs/UI_SPEC.md#ツール のショートカット表記をそのままラベルに使う。 */
const TOOLS: { tool: ActiveTool; label: string; shortcut: string }[] = [
  { tool: 'select', label: 'Select', shortcut: 'V' },
  { tool: 'addKey', label: 'Add Key', shortcut: 'K' },
  { tool: 'rotate', label: 'Rotate', shortcut: 'R' },
  { tool: 'pan', label: 'Pan', shortcut: 'H' },
];

/** docs/GEOMETRY.md#グリッドとスナップ の選択肢。 */
const GRID_SIZES = [1, 0.5, 0.25, 0.125, 0.05];

const buttonStyle: React.CSSProperties = {
  font: 'inherit',
  color: 'var(--text-secondary)',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '2px 8px',
  cursor: 'pointer',
};

function Toolbar() {
  const theme = useEditorStore((s) => s.theme);
  const setTheme = useEditorStore((s) => s.setTheme);
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const gridSize = useEditorStore((s) => s.gridSize);
  const setGridSize = useEditorStore((s) => s.setGridSize);
  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const toggleSnap = useEditorStore((s) => s.toggleSnap);
  const canUndo = useProjectStore((s) => s.canUndo);
  const canRedo = useProjectStore((s) => s.canRedo);
  const undoLabel = useProjectStore((s) => s.undoLabel);
  const redoLabel = useProjectStore((s) => s.redoLabel);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);

  return (
    <header
      data-testid="toolbar"
      style={{
        height: 'var(--toolbar-h)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: `0 ${'var(--space-3)'}`,
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border)',
        fontSize: 'var(--text-sm)',
      }}
    >
      <strong>KeyboardLayouter</strong>
      <ProjectControls />

      <div role="group" aria-label="履歴" style={{ display: 'flex', gap: 2 }}>
        <button
          type="button"
          className="kl-toolbar-button"
          data-testid="undo-button"
          disabled={!canUndo}
          aria-label="元に戻す"
          title={undoLabel ? `${undoLabel}を取り消す (Ctrl+Z)` : '元に戻す (Ctrl+Z)'}
          onClick={undo}
        >
          ↶
        </button>
        <button
          type="button"
          className="kl-toolbar-button"
          data-testid="redo-button"
          disabled={!canRedo}
          aria-label="やり直す"
          title={redoLabel ? `${redoLabel}をやり直す (Ctrl+Shift+Z)` : 'やり直す (Ctrl+Shift+Z)'}
          onClick={redo}
        >
          ↷
        </button>
      </div>

      <div role="group" aria-label="ツール" style={{ display: 'flex', gap: 2 }}>
        {TOOLS.map(({ tool, label, shortcut }) => (
          <button
            key={tool}
            type="button"
            data-testid={`tool-${tool}`}
            aria-pressed={activeTool === tool}
            aria-label={`${label} (${shortcut})`}
            title={`${label} (${shortcut})`}
            onClick={() => setActiveTool(tool)}
            style={{
              ...buttonStyle,
              background: activeTool === tool ? 'var(--accent)' : 'var(--bg-input)',
              color: activeTool === tool ? '#fff' : 'var(--text-secondary)',
              borderColor: activeTool === tool ? 'var(--accent)' : 'var(--border)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
        Grid
        <select
          data-testid="grid-size-select"
          value={gridSize}
          onChange={(e) => setGridSize(Number(e.target.value))}
          style={{
            font: 'inherit',
            fontFamily: 'var(--font-mono)',
            background: 'var(--bg-input)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {GRID_SIZES.map((size) => (
            <option key={size} value={size}>
              {`${size.toString()}U`}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        data-testid="snap-toggle"
        aria-pressed={snapEnabled}
        aria-label={`スナップ: ${snapEnabled ? '有効' : '無効'}`}
        onClick={toggleSnap}
        style={{
          ...buttonStyle,
          background: snapEnabled ? 'var(--accent)' : 'var(--bg-input)',
          color: snapEnabled ? '#fff' : 'var(--text-secondary)',
          borderColor: snapEnabled ? 'var(--accent)' : 'var(--border)',
        }}
      >
        Snap
      </button>

      <span style={{ flex: 1 }} />
      <ZoomControls />
      <div role="group" aria-label="取込・書出" style={{ display: 'flex', gap: 2 }}>
        <ImportButton />
        <ExportMenu />
      </div>
      <button
        type="button"
        data-testid="theme-toggle"
        aria-label={`テーマ: ${THEME_LABEL[theme]} (クリックで切替)`}
        onClick={() => setTheme(THEME_CYCLE[theme])}
        style={buttonStyle}
      >
        {THEME_LABEL[theme]}
      </button>
    </header>
  );
}

export default Toolbar;
