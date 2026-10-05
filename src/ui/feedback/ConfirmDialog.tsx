import { useRef } from 'react';
import { useFeedbackStore } from '@/state/appState';
import type { ConfirmRequest } from '@/state/feedbackStore';
import './feedback.css';
import { useModalKeyboard } from './useModalKeyboard';

function Dialog({ request }: { request: ConfirmRequest }) {
  const resolveConfirm = useFeedbackStore((s) => s.resolveConfirm);
  const ref = useRef<HTMLDivElement>(null);
  useModalKeyboard(ref, {
    onClose: () => resolveConfirm(false),
    // 破壊的操作は Enter の押し間違いで実行されないよう、キャンセルに初期フォーカスを置く。
    initialFocus: request.danger ? '[data-testid="confirm-cancel"]' : '[data-testid="confirm-ok"]',
  });

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
