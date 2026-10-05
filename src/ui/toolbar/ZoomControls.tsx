import { useCallback, useState } from 'react';
import { useEditorStore } from '@/state/appState';
import { fitAll, fitSelection, resetZoom, setZoomPercent, ZOOM_STEP, zoomBy } from '@/state/actions';
import MenuPopover, { type MenuItem } from './MenuPopover';

const MENU_ITEMS: MenuItem[] = [
  { id: 'fit-all', label: '全体表示 (Shift+1)', onSelect: fitAll },
  { id: 'reset', label: '100% (Ctrl+0)', onSelect: resetZoom },
  {
    id: 'fit-selection',
    label: '選択にズーム (Shift+2)',
    onSelect: fitSelection,
  },
];

/** `120`・`120%`・` 120 % ` を 120 にする。数値として読めなければ null。 */
function parsePercent(text: string): number | null {
  const value = Number(text.trim().replace(/%$/, '').trim());
  return text.trim() !== '' && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * `-` / 倍率表示 / `+`。docs/UI_SPEC.md#ツールバー。
 * 倍率表示のクリックで直接入力 (`Enter` で確定 / `Esc` で取消)、右クリックで表示メニュー。
 */
function ZoomControls() {
  const scale = useEditorStore((s) => s.scale);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const percentText = `${Math.round(scale * 100).toString()}%`;

  function commit(text: string): void {
    const percent = parsePercent(text);
    if (percent !== null) setZoomPercent(percent);
    setEditing(false);
  }

  return (
    <div
      role="group"
      aria-label="ズーム"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        position: 'relative',
      }}
    >
      <button type="button" className="kl-toolbar-button" data-testid="zoom-out" aria-label="縮小" title="縮小" onClick={() => zoomBy(1 / ZOOM_STEP)}>
        −
      </button>
      {editing ? (
        <input
          className="kl-zoom-input"
          data-testid="zoom-input"
          aria-label="倍率 (%)"
          inputMode="decimal"
          defaultValue={Math.round(scale * 100).toString()}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit(e.currentTarget.value);
            } else if (e.key === 'Escape') {
              // グローバルの Esc (選択解除) に流さない。アンマウント時の blur で確定されないよう値も戻す。
              e.stopPropagation();
              e.currentTarget.value = '';
              setEditing(false);
            }
          }}
          onBlur={(e) => commit(e.currentTarget.value)}
        />
      ) : (
        <button
          type="button"
          className="kl-toolbar-button kl-zoom-display"
          data-testid="zoom-display"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`倍率 ${percentText} (クリックで直接入力、右クリックで表示メニュー)`}
          title="クリックで直接入力、右クリックで表示メニュー"
          onClick={() => setEditing(true)}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenuOpen(true);
          }}
        >
          {percentText}
        </button>
      )}
      <button type="button" className="kl-toolbar-button" data-testid="zoom-in" aria-label="拡大" title="拡大" onClick={() => zoomBy(ZOOM_STEP)}>
        +
      </button>
      {menuOpen && <MenuPopover items={MENU_ITEMS} onClose={closeMenu} testId="zoom-menu" alignRight />}
    </div>
  );
}

export default ZoomControls;
