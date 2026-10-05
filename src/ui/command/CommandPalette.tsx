/**
 * コマンドパレット (`Cmd/Ctrl+K`)。docs/UI_SPEC.md#コマンドパレット-cmdctrlk。
 *
 * 入力欄にフォーカスを置いたまま、`↑` `↓` で候補を移動し `Enter` で実行する
 * (候補は `aria-activedescendant` で示し、フォーカスは移さない)。
 * 実行できない項目 (選択が無いときの「削除」等) は無効表示にして残す。
 * 名前で辿れることが目的なので、隠すと「その操作が無い」と誤解させるため。
 */
import { useMemo, useRef, useState } from 'react';
import { useEditorStore } from '@/state/appState';
import { useModalKeyboard } from '@/ui/feedback/useModalKeyboard';
import '@/ui/feedback/feedback.css';
import { buildCommands, type Command } from './commands';
import { rankItems } from './fuzzy';
import { recentCommandIds, rememberCommand } from './recent';
import { formatShortcut } from './shortcuts';
import './command.css';

function Palette() {
  const setOverlay = useEditorStore((s) => s.setOverlay);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  // 有効・無効は開いた時点の状態で決める (パレット表示中に選択は変わらないため)。
  const commands = useMemo(() => buildCommands().map((command) => ({ command, enabled: command.enabled?.() ?? true })), []);
  const recent = useMemo(() => recentCommandIds(), []);
  const ranked = useMemo(
    () => rankItems(commands.map(({ command }) => command), query, recent).map((command) => commands.find((c) => c.command === command)!),
    [commands, query, recent],
  );
  const recentSet = useMemo(() => new Set(recent), [recent]);
  const clampedIndex = Math.min(activeIndex, Math.max(ranked.length - 1, 0));

  function close(): void {
    setOverlay(null);
  }

  function run(command: Command): void {
    rememberCommand(command.id);
    close();
    command.run();
  }

  function move(delta: number): void {
    if (ranked.length === 0) return;
    const next = (clampedIndex + delta + ranked.length) % ranked.length;
    setActiveIndex(next);
    listRef.current?.querySelector(`[data-index="${next.toString()}"]`)?.scrollIntoView({ block: 'nearest' });
  }

  useModalKeyboard(ref, {
    onClose: close,
    onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        move(e.key === 'ArrowDown' ? 1 : -1);
      } else if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        const entry = ranked[clampedIndex];
        if (entry?.enabled) run(entry.command);
      }
    },
  });

  return (
    <div className="kl-dialog-backdrop kl-palette-backdrop" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={ref} className="kl-palette" role="dialog" aria-modal="true" aria-label="コマンドパレット" data-testid="command-palette">
        <input
          className="kl-palette-input"
          data-testid="command-palette-input"
          role="combobox"
          aria-expanded="true"
          aria-controls="kl-palette-list"
          aria-activedescendant={ranked.length > 0 ? `kl-palette-item-${clampedIndex.toString()}` : undefined}
          aria-autocomplete="list"
          placeholder="操作を検索 (例: せいれつ / align)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
        />
        <ul ref={listRef} id="kl-palette-list" className="kl-palette-list" role="listbox" aria-label="コマンド">
          {ranked.map(({ command, enabled }, index) => (
            <li
              key={command.id}
              id={`kl-palette-item-${index.toString()}`}
              role="option"
              aria-selected={index === clampedIndex}
              aria-disabled={!enabled}
              data-index={index}
              data-testid={`command-${command.id}`}
              className={['kl-palette-item', index === clampedIndex && 'kl-palette-item--active', !enabled && 'kl-palette-item--disabled'].filter(Boolean).join(' ')}
              onPointerMove={() => setActiveIndex(index)}
              onClick={() => enabled && run(command)}
            >
              <span className="kl-palette-title">{command.title}</span>
              {query.trim() === '' && recentSet.has(command.id) && <span className="kl-palette-recent">最近</span>}
              <span className="kl-palette-group">{command.group}</span>
              {command.shortcut && <kbd className="kl-kbd">{formatShortcut(command.shortcut)}</kbd>}
            </li>
          ))}
          {ranked.length === 0 && <li className="kl-palette-empty">一致する操作がありません</li>}
        </ul>
      </div>
    </div>
  );
}

function CommandPalette() {
  const open = useEditorStore((s) => s.overlay === 'commandPalette');
  return open ? <Palette /> : null;
}

export default CommandPalette;
