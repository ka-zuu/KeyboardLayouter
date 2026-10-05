/**
 * ショートカット一覧 (`?`)。docs/UI_SPEC.md#キーボードショートカット。
 * 表示内容は `shortcuts.ts` の表。
 */
import { useRef } from 'react';
import { useEditorStore } from '@/state/appState';
import { useModalKeyboard } from '@/ui/feedback/useModalKeyboard';
import '@/ui/feedback/feedback.css';
import { formatShortcut, SHORTCUT_SECTIONS } from './shortcuts';
import './command.css';

function Dialog() {
  const setOverlay = useEditorStore((s) => s.setOverlay);
  const ref = useRef<HTMLDivElement>(null);
  const close = (): void => setOverlay(null);
  useModalKeyboard(ref, { onClose: close });

  return (
    <div className="kl-dialog-backdrop" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={ref} className="kl-dialog kl-shortcut-help" role="dialog" aria-modal="true" aria-labelledby="kl-shortcut-help-title" data-testid="shortcut-help">
        <div className="kl-shortcut-help-header">
          <h2 id="kl-shortcut-help-title" className="kl-dialog-title">
            キーボードショートカット
          </h2>
          <button type="button" className="kl-dialog-button" data-testid="shortcut-help-close" onClick={close}>
            閉じる
          </button>
        </div>
        <div className="kl-shortcut-help-body">
          {SHORTCUT_SECTIONS.map((section) => (
            <section key={section.title} className="kl-shortcut-section">
              <h3 className="kl-shortcut-section-title">{section.title}</h3>
              <dl className="kl-shortcut-list">
                {section.entries.map((entry) => (
                  <div key={entry.keys} className="kl-shortcut-row">
                    <dt>
                      <kbd className="kl-kbd">{formatShortcut(entry.keys)}</kbd>
                    </dt>
                    <dd>{entry.description}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <p className="kl-shortcut-help-hint">
          すべての操作は <kbd className="kl-kbd">{formatShortcut('Mod+K')}</kbd> のコマンドパレットからも実行できます。
        </p>
      </div>
    </div>
  );
}

function ShortcutHelpDialog() {
  const open = useEditorStore((s) => s.overlay === 'shortcutHelp');
  return open ? <Dialog /> : null;
}

export default ShortcutHelpDialog;
