import { useCallback, useState } from 'react';
import { serializeProject } from '@/io/project/serialize';
import type { SerializeResult } from '@/io/types';
import { downloadFile } from '@/platform/download';
import { useFeedbackStore, useProjectStore } from '@/state/appState';
import MenuPopover, { type MenuItem } from './MenuPopover';

function download(result: SerializeResult, mimeType: string): void {
  for (const file of result.files) downloadFile(file.name, file.content, mimeType);
  if (result.warnings.length > 0) {
    useFeedbackStore.getState().pushToast({
      kind: 'warning',
      message: `書き出しで ${result.warnings.length.toString()} 件の情報が失われました。`,
      details: result.warnings.map((w) => w.message),
    });
  }
}

function exportProjectJson(): void {
  download(serializeProject(useProjectStore.getState().project), 'application/json');
}

/** 未実装の形式。無効表示にして、対応予定のマイルストーンをツールチップに出す (docs/ROADMAP.md)。 */
const UNSUPPORTED: { id: string; label: string; milestone: string }[] = [
  { id: 'kle', label: 'KLE raw JSON', milestone: 'M3' },
  { id: 'qmk-info', label: 'QMK info.json', milestone: 'M4' },
  { id: 'qmk-keymap', label: 'QMK keymap 雛形', milestone: 'M4' },
  { id: 'kicad', label: 'KiCad zip', milestone: 'M5' },
  { id: 'via', label: 'VIA 定義', milestone: 'M6' },
  { id: 'ergogen', label: 'Ergogen YAML', milestone: 'M6' },
];

/** ツールバーの [書出▾]。docs/UI_SPEC.md#ツールバー。 */
function ExportMenu() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const items: MenuItem[] = [
    { id: 'project', label: 'プロジェクト JSON', onSelect: exportProjectJson },
    ...UNSUPPORTED.map(({ id, label, milestone }) => ({
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
