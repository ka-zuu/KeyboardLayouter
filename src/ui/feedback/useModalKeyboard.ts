import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])';

interface ModalKeyboardOptions {
  /** `Esc` で呼ぶ。 */
  onClose(): void;
  /** 開いたときにフォーカスする要素のセレクタ。省略時は最初のフォーカス可能要素。 */
  initialFocus?: string;
  /** `Esc` / `Tab` 以外のキー。ダイアログ内の要素の React `onKeyDown` には届かないので、ここで受ける。 */
  onKeyDown?(e: KeyboardEvent): void;
}

/**
 * モーダル (確認ダイアログ・コマンドパレット・ショートカット一覧) の共通キー操作
 * (docs/UI_SPEC.md#アクセシビリティ の「`role="dialog"` + フォーカストラップ + `Esc` で閉じる」)。
 *
 * `window` の capture で受けて伝播を止め、グローバルショートカット (Esc の選択解除・
 * Delete 等) に流さない (MenuPopover.tsx と同じ流儀)。既定動作は止めないので、
 * ボタンの Enter / Space による押下や入力欄への文字入力はそのまま効く。
 * 閉じたら、開く前にフォーカスしていた要素へ戻す。
 */
export function useModalKeyboard(ref: React.RefObject<HTMLElement | null>, options: ModalKeyboardOptions): void {
  // 毎レンダーで変わるコールバックで effect を張り直さない (初期フォーカスとフォーカス復帰が
  // やり直されてしまうため)。最新のものは ref 経由で読む。
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const { initialFocus } = optionsRef.current;
    (initialFocus ? root.querySelector<HTMLElement>(initialFocus) : root.querySelector<HTMLElement>(FOCUSABLE))?.focus();

    function onKeyDown(e: KeyboardEvent): void {
      if (!root) return;
      e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        optionsRef.current.onClose();
        return;
      }
      if (e.key === 'Tab') {
        const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
        e.preventDefault();
        if (items.length === 0) return;
        const index = items.indexOf(document.activeElement as HTMLElement);
        const next = (index + (e.shiftKey ? -1 : 1) + items.length) % items.length;
        items[next]?.focus();
        return;
      }
      optionsRef.current.onKeyDown?.(e);
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      // 閉じると同時に別の要素がフォーカスを取った場合 (パレットから「刻印を編集」を実行して
      // 入力欄が開いた等) は奪わない。ダイアログ内にフォーカスがあったなら、DOM から外れて body に戻っている。
      const active = document.activeElement;
      if (!active || active === document.body || root.contains(active)) previouslyFocused?.focus();
    };
  }, [ref]);
}
