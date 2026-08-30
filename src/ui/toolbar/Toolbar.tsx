import { useEditorStore } from '@/state/appState';
import type { ThemePreference } from '@/platform/storage/appStorage';
import type { ActiveTool } from '@/core/model/types';

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
  const scale = useEditorStore((s) => s.scale);
  const theme = useEditorStore((s) => s.theme);
  const setTheme = useEditorStore((s) => s.setTheme);
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const gridSize = useEditorStore((s) => s.gridSize);
  const setGridSize = useEditorStore((s) => s.setGridSize);
  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const toggleSnap = useEditorStore((s) => s.toggleSnap);

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
      <span data-testid="zoom-display" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
        {`${Math.round(scale * 100).toString()}%`}
      </span>
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
