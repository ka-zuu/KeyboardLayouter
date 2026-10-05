import { useEffect, useRef } from 'react';
import { useFeedbackStore } from '@/state/appState';
import type { ConfirmRequest } from '@/state/feedbackStore';
import './feedback.css';

function focusableIn(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('button:not(:disabled)')];
}

function Dialog({ request }: { request: ConfirmRequest }) {
  const resolveConfirm = useFeedbackStore((s) => s.resolveConfirm);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // 破壊的操作は Enter の押し間違いで実行されないよう、キャンセルに初期フォーカスを置く。
    root.querySelector<HTMLElement>(request.danger ? '[data-testid="confirm-cancel"]' : '[data-testid="confirm-ok"]')?.focus();

    // capture で受けて伝播を止め、グローバルショートカット (Esc の選択解除・Delete 等) に流さない
    // (MenuPopover.tsx と同じ流儀)。ボタンの Enter / Space による押下は既定動作なので止まらない。
    function onKeyDown(e: KeyboardEvent): void {
      if (!root) return;
      e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        resolveConfirm(false);
        return;
      }
      if (e.key === 'Tab') {
        const items = focusableIn(root);
        if (items.length === 0) return;
        e.preventDefault();
        const index = items.indexOf(document.activeElement as HTMLElement);
        const next = (index + (e.shiftKey ? -1 : 1) + items.length) % items.length;
        items[next]?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      previouslyFocused?.focus();
    };
  }, [request, resolveConfirm]);

  return (
    <div className="kl-dialog-backdrop" onPointerDown={(e) => e.target === e.currentTarget && resolveConfirm(false)}>
      <div ref={ref} className="kl-dialog" role="dialog" aria-modal="true" aria-labelledby="kl-confirm-title" aria-describedby="kl-confirm-message" data-testid="confirm-dialog">
        <h2 id="kl-confirm-title" className="kl-dialog-title">
          {request.title}
        </h2>
        <p id="kl-confirm-message" className="kl-dialog-message">
          {request.message}
        </p>
        <div className="kl-dialog-actions">
          <button type="button" className="kl-dialog-button" data-testid="confirm-cancel" onClick={() => resolveConfirm(false)}>
            キャンセル
          </button>
          <button
            type="button"
            className={request.danger ? 'kl-dialog-button kl-dialog-button--danger' : 'kl-dialog-button kl-dialog-button--primary'}
            data-testid="confirm-ok"
            onClick={() => resolveConfirm(true)}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 破壊的操作の確認ダイアログ (docs/UI_SPEC.md#エラーとフィードバック / #アクセシビリティ)。
 * `role="dialog"` + フォーカストラップ + `Esc` で閉じる。App.tsx で 1 回だけ置く。
 */
function ConfirmDialog() {
  const request = useFeedbackStore((s) => s.confirmRequest);
  // 要求ごとに再マウントし、初期フォーカスとフォーカス復帰をやり直す。
  return request ? <Dialog key={request.title + request.message} request={request} /> : null;
}

export default ConfirmDialog;
