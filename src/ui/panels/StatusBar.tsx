function StatusBar() {
  return (
    <footer
      data-testid="status-bar"
      style={{
        height: 'var(--statusbar-h)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: `0 ${'var(--space-3)'}`,
        background: 'var(--bg-panel)',
        borderTop: '1px solid var(--border)',
        fontSize: 'var(--text-xs)',
        color: 'var(--text-secondary)',
      }}
    />
  );
}

export default StatusBar;
