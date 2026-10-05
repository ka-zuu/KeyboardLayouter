ポインタ操作・キーボードショートカット等の React hooks。

| ファイル | 内容 |
|---|---|
| `useBootstrap.ts` | 起動時の読み込み。`appStorage` → (空なら) 旧アプリのデータ → 新規プロジェクトの順に試し、`projectStore.loadProject()` へ反映する |
| `useAutoSave.ts` | プロジェクト・グリッド設定の変更を `appStorage` へ書く。`useBootstrap` の読み込み完了 (`enabled: true`) まで待つ |
| `useElementSize.ts` | `ResizeObserver` で要素の実ピクセルサイズを取得する |
| `useViewport.ts` | ホイールズーム (カーソル固定) / `Shift`+ホイールで横スクロール / 中ボタン・`Space`+ドラッグ・Pan ツールの左ドラッグでパン / 2 本指ピンチ |
| `useCanvasInteraction.ts` | ツール別のキャンバス操作 (クリック選択・矩形選択・ドラッグ移動・`Alt`+ドラッグ複製・回転ハンドル・Add Key ツールの配置・ダブルクリックでの刻印編集)。`useViewport` と同じ要素にリスナを張り、中ボタン/`Space`/Pan ツールのときは何もしない |
| `useGlobalShortcuts.ts` | キーボードショートカット一式 (docs/UI_SPEC.md#キーボードショートカット)。入力欄フォーカス中は単独キーのショートカットを無効化し、`Esc` と `Cmd/Ctrl` 併用のものだけ有効にする。表示用の一覧は `ui/command/shortcuts.ts` にあり、両方を揃える |
| `useInitialPanelLayout.ts` | 起動時の画面幅が 1024px 未満なら左パネルを折りたたむ |

`Space` 押下状態は `editorStore.spacePressed` で一元管理する (`useGlobalShortcuts` が
監視・更新し、`useViewport` はそれを読むだけ)。
