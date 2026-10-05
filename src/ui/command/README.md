コマンドパレットとコマンド定義 (docs/UI_SPEC.md#コマンドパレット-cmdctrlk)、ショートカット一覧 (`?`)。

| ファイル | 内容 |
|---|---|
| `commands.ts` | パレットに並べる操作の定義。処理本体は `state/actions.ts` 等の既存関数を呼ぶだけ。`keywords` に英語名と漢字の読み (ひらがな) を書く |
| `fuzzy.ts` | 曖昧一致 (部分列一致 + 連続・語頭の加点) と並び順。NFKC 正規化とカタカナ → ひらがな変換をしてから比べる |
| `recent.ts` | 最近使った操作 (最大 5 件)。`localStorage` にベストエフォートで残す |
| `shortcuts.ts` | ショートカット一覧の表示内容と、`Mod` 表記 → `Cmd` / `Ctrl` の変換。キー処理本体は `ui/hooks/useGlobalShortcuts.ts` |
| `CommandPalette.tsx` | `Cmd/Ctrl+K` のパレット。入力欄にフォーカスを置いたまま `↑` `↓` / `Enter` で選んで実行する |
| `ShortcutHelpDialog.tsx` | `?` のショートカット一覧 |

操作を増やしたら `commands.ts` にも足す。ショートカットを併記した場合は `shortcuts.ts` の一覧にも
載っていることを `tests/unit/ui/command.test.ts` が検査する。
