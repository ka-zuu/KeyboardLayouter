/**
 * ショートカット一覧 (`?`) の表示内容。docs/UI_SPEC.md#キーボードショートカット と 1 対 1。
 * 実際のキー処理は `ui/hooks/useGlobalShortcuts.ts` にあり、ここは表示用の表。
 *
 * キーは `Mod` (Mac は Cmd、それ以外は Ctrl) を使った表記で書き、表示時に
 * `formatShortcut` で環境に合わせて変換する。
 */

export interface ShortcutEntry {
  /** `Mod+Shift+Z` のような表記。別名は ` / ` で区切る。 */
  keys: string;
  description: string;
}

export interface ShortcutSection {
  title: string;
  entries: readonly ShortcutEntry[];
}

export const SHORTCUT_SECTIONS: readonly ShortcutSection[] = [
  {
    title: '全般',
    entries: [
      { keys: 'Mod+K', description: 'コマンドパレット' },
      { keys: '?', description: 'ショートカット一覧を表示' },
      { keys: 'Mod+S', description: 'プロジェクトを保存' },
      { keys: 'Esc', description: '選択解除 / ツールを Select に戻す / ダイアログを閉じる' },
    ],
  },
  {
    title: 'ツール',
    entries: [
      { keys: 'V', description: 'Select ツール' },
      { keys: 'K', description: 'Add Key ツール' },
      { keys: 'R', description: 'Rotate ツール' },
      { keys: 'H', description: 'Pan ツール' },
      { keys: 'Space', description: '押している間だけパン' },
    ],
  },
  {
    title: '編集',
    entries: [
      { keys: 'Mod+Z', description: '取り消し' },
      { keys: 'Mod+Shift+Z / Ctrl+Y', description: 'やり直し' },
      { keys: 'Mod+A', description: 'すべて選択' },
      { keys: 'Mod+C / Mod+V', description: 'コピー / 貼り付け' },
      { keys: 'Mod+D', description: '複製' },
      { keys: 'Delete / Backspace', description: '選択中のキーを削除' },
      { keys: 'Enter', description: '主刻印をキャンバス上で編集 (ダブルクリックでも可)' },
      { keys: '↑ ↓ ← →', description: '選択中のキーをグリッド幅だけ移動' },
      { keys: 'Shift+矢印', description: '1U 単位で移動' },
      { keys: 'Tab / Shift+Tab', description: '次 / 前のキーを選択' },
      { keys: 'Alt+ドラッグ', description: '複製しながら移動' },
    ],
  },
  {
    title: '表示',
    entries: [
      { keys: 'Mod+G', description: 'スナップの有効・無効' },
      { keys: 'Mod+M', description: 'マトリクス番号の表示切り替え' },
      { keys: 'Mod+0', description: 'ズーム 100%' },
      { keys: 'Shift+1', description: '全体を表示' },
      { keys: 'Shift+2', description: '選択にズーム' },
      { keys: 'Mod+\\', description: '左パネルの折りたたみ' },
      { keys: 'Mod+Alt+\\', description: 'インスペクタの折りたたみ' },
    ],
  },
];

export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);
}

/** `Mod+Alt+K` を `Cmd+Option+K` (Mac) / `Ctrl+Alt+K` (それ以外) に変換する。 */
export function formatShortcut(keys: string, isMac: boolean = isMacPlatform()): string {
  return keys
    .split(' / ')
    .map((alias) =>
      alias
        .split('+')
        .map((part) => {
          if (part === 'Mod') return isMac ? 'Cmd' : 'Ctrl';
          if (part === 'Alt' && isMac) return 'Option';
          return part;
        })
        .join('+'),
    )
    .join(' / ');
}
