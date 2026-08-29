import { useEditorStore } from '@/state/appState';
import type { SaveStatus } from '@/platform/storage/appStorage';

const SAVE_STATUS_LABEL: Record<SaveStatus, string> = {
  idle: '',
  saving: '保存中…',
  saved: '保存済み',
  failed: '保存に失敗しました',
};

interface StatusBarProps {
  saveStatus: SaveStatus;
}

function StatusBar({ saveStatus }: StatusBarProps) {
  const selectedCount = useEditorStore((s) => s.selectedKeyIds.length);

  return (
    <footer
      data-testid="status-bar"
      style={{
        height: 'var(--statusbar-h)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: `0 ${'var(--space-3)'}`,
        background: 'var(--bg-panel)',
        borderTop: '1px solid var(--border)',
        fontSize: 'var(--text-xs)',
        color: 'var(--text-secondary)',
      }}
    >
      <span data-testid="selection-count">{selectedCount > 0 ? `選択 ${selectedCount.toString()} 個` : '選択なし'}</span>
      <span style={{ flex: 1 }} />
      <span data-testid="save-status" aria-live="polite">
        {SAVE_STATUS_LABEL[saveStatus]}
      </span>
    </footer>
  );
}

export default StatusBar;
