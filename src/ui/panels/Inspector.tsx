function Inspector() {
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
    />
  );
}

export default Inspector;
