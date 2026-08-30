Zustand ストア (プロジェクト + 編集状態) と Undo/Redo 履歴。

| ファイル | 内容 |
|---|---|
| `history.ts` | スナップショット履歴 (`docs/adr/0003-state-and-history.md`)。上限 50 段、`coalesceKey` でドラッグ中の連続更新を 1 段にまとめる |
| `projectStore.ts` | `ProjectModel` + 履歴。全アクションは `core/commands/` の純関数を呼ぶだけ |
| `editorStore.ts` | 選択・ズーム・パン・グリッド・スナップ・ツール・クリップボードと、UI 専用の追加フィールド (テーマ・マトリクス番号表示・パネル折りたたみ・`Space` 押下状態・キャンバスの実寸) |
| `selectors.ts` | プロジェクト + 編集状態から派生する値 (選択中のキー・選択範囲の AABB・マトリクス検証結果) |
| `appState.ts` | アプリ全体で共有する唯一のストアインスタンス。テストは `createProjectStore` / `createEditorStore` で個別のインスタンスを作る |
| `actions.ts` | 複数のフック (`ui/hooks/useGlobalShortcuts.ts` / `useCanvasInteraction.ts`) から共有する複合アクション (`duplicateAndSelect` など) |

選択状態は `editorStore` にのみ置き、`ProjectModel` / `KeyModel` には混入させない
(`KeyData.isSelected` の再来を避ける)。
