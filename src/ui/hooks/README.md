ポインタ操作・キーボードショートカット等の React hooks。

| ファイル | 内容 |
|---|---|
| `useBootstrap.ts` | 起動時の読み込み。`appStorage` → (空なら) 旧アプリのデータ → 新規プロジェクトの順に試し、`projectStore.loadProject()` へ反映する |
| `useAutoSave.ts` | プロジェクト・グリッド設定の変更を `appStorage` へ書く。`useBootstrap` の読み込み完了 (`enabled: true`) まで待つ |
| `useElementSize.ts` | `ResizeObserver` で要素の実ピクセルサイズを取得する |
| `useViewport.ts` | ホイールズーム (カーソル固定) / `Shift`+ホイールで横スクロール / 中ボタン・`Space`+ドラッグでパン / 2 本指ピンチ |

ショートカット (`V`/`K`/`R`/`H` のツール切替、`Cmd/Ctrl+Z` 等) は M2-3 以降で追加する。
