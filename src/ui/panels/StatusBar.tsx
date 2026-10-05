import { useMemo } from 'react';
import { overlappingKeyIds } from '@/core/geometry/overlap';
import { useEditorStore, useProjectStore } from '@/state/appState';
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
  const selectedKeyIds = useEditorStore((s) => s.selectedKeyIds);
  const keys = useProjectStore((s) => s.project.keys);
  const selectedCount = selectedKeyIds.length;
  // 選択中のキーが他のキーと重なっていれば知らせる (docs/UI_SPEC.md#キーの重なり)。
  // 追加したキーは選択状態になるので、空きが見つからず重ねて置いた場合もここで分かる。
  const overlapCount = useMemo(() => overlappingKeyIds(keys, selectedKeyIds).length, [keys, selectedKeyIds]);

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
      {overlapCount > 0 && (
        <span
          data-testid="overlap-warning"
          role="status"
          title={`選択中の ${overlapCount.toString()} 個のキーが他のキーと重なっています (重なりは禁止していません)`}
          style={{ color: 'var(--text-primary)' }}
        >
          ⚠ 重なっています
        </span>
      )}
      <span style={{ flex: 1 }} />
      <span data-testid="save-status" aria-live="polite">
        {SAVE_STATUS_LABEL[saveStatus]}
      </span>
    </footer>
  );
}

export default StatusBar;
