import { useEffect, useRef } from 'react';

export interface MenuItem {
  id: string;
  label: string;
  onSelect(): void;
  danger?: boolean;
  /** 無効表示にする (未対応の書出形式など)。 */
  disabled?: boolean;
  /** ツールチップ (無効の理由など)。 */
  title?: string;
}

interface MenuPopoverProps {
  items: readonly MenuItem[];
  onClose(): void;
  testId: string;
  /** 右寄せにする (画面右端のメニュー用)。 */
  alignRight?: boolean;
}

/**
 * ツールバーのドロップダウン。親を `position: relative` にして直下に置く。
 * Esc / 外側クリックで閉じる。開いたら先頭項目にフォーカスし、上下キーで移動する。
 */
function MenuPopover({ items, onClose, testId, alignRight = false }: MenuPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();

    function onPointerDown(e: PointerEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onClose]);

  function onMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    e.stopPropagation();
    const buttons = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = (index + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }

  return (
    <div ref={ref} role="menu" className="kl-menu" data-testid={testId} style={alignRight ? { right: 0 } : { left: 0 }} onKeyDown={onMenuKeyDown}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          className={item.danger ? 'kl-menu-item kl-menu-item--danger' : 'kl-menu-item'}
          data-testid={`${testId}-${item.id}`}
          disabled={item.disabled}
          title={item.title}
          onClick={() => {
            onClose();
            item.onSelect();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default MenuPopover;
