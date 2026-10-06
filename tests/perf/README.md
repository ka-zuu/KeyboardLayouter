性能テスト。基準は docs/TESTING.md#性能テスト。

```bash
npm run test:perf   # 1000 キー (40 x 25、5 個に 1 個は回転) で各操作を計測して表示
```

- 計測対象は純粋関数層 (`buildScene` / `moveKeys` / `keysIntersectingRect` /
  `serializeProject` / `autoAssignMatrix`)。React の再描画時間は含まない。
- 目標を超えても失敗にはしない (`console.warn` で警告)。環境差が大きいため。
- `npm test` (ユニット + UI) には含まれない。
