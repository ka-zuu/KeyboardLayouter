Zustand ストア (プロジェクト + 編集状態) と Undo/Redo 履歴。

| ファイル | 内容 |
|---|---|
| `history.ts` | スナップショット履歴 (`docs/adr/0003-state-and-history.md`)。上限 50 段、`coalesceKey` でドラッグ中の連続更新を 1 段にまとめる |
| `projectStore.ts` | `ProjectModel` + 履歴。全アクションは `core/commands/` の純関数を呼ぶだけ |
| `editorStore.ts` | 選択・ズーム・パン・グリッド・スナップ・ツール・クリップボードと、UI 専用の追加フィールド (テーマ・マトリクス番号表示・パネル折りたたみ・`Space` 押下状態・キャンバスの実寸・開いているオーバーレイ (コマンドパレット / ショートカット一覧)・刻印を直接編集中のキー) |
| `selectors.ts` | プロジェクト + 編集状態から派生する値 (選択中のキー・選択範囲の AABB・マトリクス検証結果) |
| `appState.ts` | アプリ全体で共有する唯一のストアインスタンス。テストは `createProjectStore` / `createEditorStore` で個別のインスタンスを作る |
| `actions.ts` | 複数の入口 (ショートカット・キャンバス操作・ツールバー・コマンドパレット) から共有する複合アクション (`duplicateAndSelect` / `pasteClipboard` / `setZoomPercent` / `startLegendEdit` / `importProject` など) |
| `projectActions.ts` | 複数プロジェクトの管理と明示保存 (`saveNow`)。ストレージに触るのはこのファイルだけ |
| `feedbackStore.ts` | トーストと確認ダイアログの要求 (`requestConfirm` は Promise で結果を返す)。表示は `ui/feedback/` |

選択状態は `editorStore` にのみ置き、`ProjectModel` / `KeyModel` には混入させない
(`KeyData.isSelected` の再来を避ける)。
