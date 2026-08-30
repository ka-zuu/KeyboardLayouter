ポインタ操作・キーボードショートカット等の React hooks。

| ファイル | 内容 |
|---|---|
| `useBootstrap.ts` | 起動時の読み込み。`appStorage` → (空なら) 旧アプリのデータ → 新規プロジェクトの順に試し、`projectStore.loadProject()` へ反映する |
| `useAutoSave.ts` | プロジェクト・グリッド設定の変更を `appStorage` へ書く。`useBootstrap` の読み込み完了 (`enabled: true`) まで待つ |
| `useElementSize.ts` | `ResizeObserver` で要素の実ピクセルサイズを取得する |
| `useViewport.ts` | ホイールズーム (カーソル固定) / `Shift`+ホイールで横スクロール / 中ボタン・`Space`+ドラッグ・Pan ツールの左ドラッグでパン / 2 本指ピンチ |
| `useCanvasInteraction.ts` | ツール別のキャンバス操作 (クリック選択・矩形選択・ドラッグ移動・`Alt`+ドラッグ複製・回転ハンドル・Add Key ツールの配置)。`useViewport` と同じ要素にリスナを張り、中ボタン/`Space`/Pan ツールのときは何もしない |
| `useGlobalShortcuts.ts` | キーボードショートカット一式 (docs/UI_SPEC.md#キーボードショートカット)。入力欄フォーカス中は単独キーのショートカットを無効化し、`Esc` と `Cmd/Ctrl` 併用のものだけ有効にする |

`Space` 押下状態は `editorStore.spacePressed` で一元管理する (`useGlobalShortcuts` が
監視・更新し、`useViewport` はそれを読むだけ)。

`Cmd/Ctrl+K` (コマンドパレット)・`?` (ショートカット一覧ダイアログ)・`Cmd/Ctrl+S` (明示保存) は
対応する UI が無いため未実装 (M2-4 で UI と一緒に追加する)。
