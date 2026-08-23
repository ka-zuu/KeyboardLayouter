function Toolbar() {
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
    </header>
  );
}

export default Toolbar;
