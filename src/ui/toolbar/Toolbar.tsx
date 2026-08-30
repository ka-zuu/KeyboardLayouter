import { useEditorStore } from '@/state/appState';
import type { ThemePreference } from '@/platform/storage/appStorage';

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

function Toolbar() {
  const scale = useEditorStore((s) => s.scale);
  const theme = useEditorStore((s) => s.theme);
  const setTheme = useEditorStore((s) => s.setTheme);

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
      <span style={{ flex: 1 }} />
      <span data-testid="zoom-display" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
        {`${Math.round(scale * 100).toString()}%`}
      </span>
      <button
        type="button"
        data-testid="theme-toggle"
        aria-label={`テーマ: ${THEME_LABEL[theme]} (クリックで切替)`}
        onClick={() => setTheme(THEME_CYCLE[theme])}
        style={{
          font: 'inherit',
          color: 'var(--text-secondary)',
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '2px 8px',
          cursor: 'pointer',
        }}
      >
        {THEME_LABEL[theme]}
      </button>
    </header>
  );
}

export default Toolbar;
