/**
 * トーストと確認ダイアログ (docs/UI_SPEC.md#エラーとフィードバック)。
 *
 * 表示は `ui/feedback/` が担い、ここは「何を出すか」だけを持つ。
 * トーストの自動消去 (タイマー) は UI 側の責務。
 */
import { create, type StoreApi, type UseBoundStore } from 'zustand';

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  /** 補足 (変換の警告・検証エラーの一覧など)。折りたたんで表示する。 */
  details: string[];
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  /** 破壊的操作 (削除など)。確認ボタンを危険色にし、初期フォーカスをキャンセルに置く。 */
  danger?: boolean;
}

export interface ConfirmRequest extends ConfirmOptions {
  resolve(ok: boolean): void;
}

export interface FeedbackStoreState {
  toasts: Toast[];
  confirmRequest: ConfirmRequest | null;

  pushToast(toast: { kind: ToastKind; message: string; details?: string[] }): number;
  dismissToast(id: number): void;
  /** 確認ダイアログを出し、選択結果で解決する。表示中の別の要求はキャンセル扱いにする。 */
  requestConfirm(options: ConfirmOptions): Promise<boolean>;
  resolveConfirm(ok: boolean): void;
}

export type FeedbackStore = UseBoundStore<StoreApi<FeedbackStoreState>>;

export function createFeedbackStore(): FeedbackStore {
  let nextId = 1;

  return create<FeedbackStoreState>((set, get) => ({
    toasts: [],
    confirmRequest: null,

    pushToast({ kind, message, details = [] }) {
      const id = nextId++;
      set({ toasts: [...get().toasts, { id, kind, message, details }] });
      return id;
    },
    dismissToast(id) {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    },

    requestConfirm(options) {
      get().confirmRequest?.resolve(false);
      return new Promise<boolean>((resolve) => {
        set({ confirmRequest: { ...options, resolve } });
      });
    },
    resolveConfirm(ok) {
      const request = get().confirmRequest;
      if (!request) return;
      set({ confirmRequest: null });
      request.resolve(ok);
    },
  }));
}
