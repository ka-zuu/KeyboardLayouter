トーストと確認ダイアログ (docs/UI_SPEC.md#エラーとフィードバック)。

| ファイル | 内容 |
|---|---|
| `ToastHost.tsx` | `state/feedbackStore.ts` の `toasts` を右下に積んで表示。error 以外は 5 秒で自動消去 |
| `useModalKeyboard.ts` | モーダル共通のキー操作 (フォーカストラップ・`Esc` で閉じる・グローバルショートカットへ流さない・閉じたらフォーカスを戻す)。確認ダイアログ・コマンドパレット・ショートカット一覧で使う |
| `ConfirmDialog.tsx` | `confirmRequest` を `role="dialog"` で表示。フォーカストラップ・`Esc` でキャンセル。表示中はキー入力をグローバルショートカットに流さない |

どちらも `App.tsx` に 1 つだけ置く。呼び出し側は `useFeedbackStore.getState().pushToast()` /
`requestConfirm()` を使い、コンポーネントを直接置かない。
