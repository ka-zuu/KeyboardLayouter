/**
 * ライト / ダーク / システム追従のテーマ切り替え。docs/UI_SPEC.md#デザイントークン。
 * `tokens.css` は `:root[data-theme]` と `prefers-color-scheme` の両方に
 * 対応済みなので、ここでは `<html>` の `data-theme` 属性を出し入れするだけでよい。
 */
import { useEffect } from 'react';
import { useEditorStore } from '@/state/appState';

export function useTheme(): void {
  const theme = useEditorStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);
}
