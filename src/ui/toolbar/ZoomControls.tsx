import { useCallback, useState } from 'react';
import { useEditorStore } from '@/state/appState';
import { fitAll, fitSelection, resetZoom, ZOOM_STEP, zoomBy } from '@/state/actions';
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

/** `-` / 倍率表示 / `+`。倍率表示の右クリック (またはクリック) で表示メニュー。docs/UI_SPEC.md#ツールバー。 */
function ZoomControls() {
  const scale = useEditorStore((s) => s.scale);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

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
      <button
        type="button"
        className="kl-toolbar-button kl-zoom-display"
        data-testid="zoom-display"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title="右クリックで表示メニュー"
        onClick={() => setMenuOpen((open) => !open)}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuOpen(true);
        }}
      >
        {`${Math.round(scale * 100).toString()}%`}
      </button>
      <button type="button" className="kl-toolbar-button" data-testid="zoom-in" aria-label="拡大" title="拡大" onClick={() => zoomBy(ZOOM_STEP)}>
        +
      </button>
      {menuOpen && <MenuPopover items={MENU_ITEMS} onClose={closeMenu} testId="zoom-menu" alignRight />}
    </div>
  );
}

export default ZoomControls;
