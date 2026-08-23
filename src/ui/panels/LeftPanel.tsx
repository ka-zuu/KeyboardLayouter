function LeftPanel() {
  return (
    <aside
      data-testid="left-panel"
      style={{
        width: 'var(--panel-left-w)',
        flexShrink: 0,
        background: 'var(--bg-panel)',
        borderRight: '1px solid var(--border)',
        overflowY: 'auto',
      }}
    />
  );
}

export default LeftPanel;
