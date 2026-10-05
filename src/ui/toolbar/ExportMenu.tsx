import { useCallback, useState } from 'react';
import MenuPopover, { type MenuItem } from './MenuPopover';
import { exportProjectJson, UNSUPPORTED_EXPORTS } from './exportActions';

/** ツールバーの [書出▾]。docs/UI_SPEC.md#ツールバー。 */
function ExportMenu() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const items: MenuItem[] = [
    { id: 'project', label: 'プロジェクト JSON', onSelect: exportProjectJson },
    ...UNSUPPORTED_EXPORTS.map(({ id, label, milestone }) => ({
      id,
      label: `${label} (未対応)`,
      disabled: true,
      title: `${milestone} で対応予定`,
      onSelect: () => undefined,
    })),
  ];

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        className="kl-toolbar-button"
        data-testid="export-menu-button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        書出 ▾
      </button>
      {open && <MenuPopover items={items} onClose={close} testId="export-menu" alignRight />}
    </div>
  );
}

export default ExportMenu;
