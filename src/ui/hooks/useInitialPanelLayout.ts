import { useEffect } from 'react';
import { useEditorStore } from '@/state/appState';

/** これより狭い画面では左パネルを既定で折りたたむ (docs/UI_SPEC.md#画面構成)。 */
const COLLAPSE_LEFT_BELOW_PX = 1024;

/**
 * 起動時の画面幅に応じてパネルの初期状態を決める。以降のリサイズでは変えない
 * (ユーザーが開閉した状態を勝手に覆さないため)。
 */
export function useInitialPanelLayout(): void {
  useEffect(() => {
    if (window.innerWidth < COLLAPSE_LEFT_BELOW_PX) useEditorStore.getState().setLeftPanelCollapsed(true);
  }, []);
}
