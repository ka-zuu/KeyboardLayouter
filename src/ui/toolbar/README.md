上部ツールバーとエクスポートメニュー。

| ファイル | 内容 |
|---|---|
| `Toolbar.tsx` | ツールバー全体。パネル折りたたみボタン (左端 ◧ / 右端 ◨) とコマンドパレットを開くボタンもここ |
| `ProjectControls.tsx` | プロジェクト名のインライン編集とプロジェクトメニュー |
| `ZoomControls.tsx` | `-` / 倍率表示 / `+`。倍率表示のクリックで直接入力、右クリックで表示メニュー |
| `ImportButton.tsx` / `importActions.ts` | 取込。処理本体はコマンドパレットと共用するため `importActions.ts` に置く |
| `ExportMenu.tsx` / `exportActions.ts` | 書出。同上 |
| `MenuPopover.tsx` | ドロップダウンの共通部品 |
