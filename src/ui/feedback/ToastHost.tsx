import { useEffect } from 'react';
import { useFeedbackStore } from '@/state/appState';
import type { Toast, ToastKind } from '@/state/feedbackStore';
import './feedback.css';

/** error 以外はこの時間で自動的に消す。error は理由を読めるよう手動で閉じるまで残す。 */
const AUTO_DISMISS_MS = 5000;

/** 色だけで種類を伝えないよう、アイコンも併用する (docs/UI_SPEC.md#アクセシビリティ)。 */
const ICON: Record<ToastKind, string> = {
  info: 'i',
  success: '✓',
  warning: '!',
  error: '✕',
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismissToast = useFeedbackStore((s) => s.dismissToast);

  useEffect(() => {
    if (toast.kind === 'error') return;
    const timer = setTimeout(() => dismissToast(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, toast.kind, dismissToast]);

  return (
    <div className={`kl-toast kl-toast--${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'} data-testid={`toast-${toast.kind}`}>
      <span className="kl-toast-icon" aria-hidden="true">
        {ICON[toast.kind]}
      </span>
      <div className="kl-toast-body">
        <div className="kl-toast-message">{toast.message}</div>
        {toast.details.length > 0 && (
          <details className="kl-toast-details">
            <summary>詳細 ({toast.details.length.toString()} 件)</summary>
            <ul>
              {toast.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
      <button type="button" className="kl-toast-dismiss" data-testid="toast-dismiss" aria-label="閉じる" onClick={() => dismissToast(toast.id)}>
        ×
      </button>
    </div>
  );
}

/** 画面右下に積むトースト。docs/UI_SPEC.md#エラーとフィードバック。App.tsx で 1 回だけ置く。 */
function ToastHost() {
  const toasts = useFeedbackStore((s) => s.toasts);

  return (
    <div className="kl-toast-host" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

export default ToastHost;
