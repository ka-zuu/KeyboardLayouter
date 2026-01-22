# 仕様書 (SPECIFICATIONS)

## データ構造

### KeyData
個々のキーの定義。
単位 `U` (Unit) は `19.05mm` 相当ですが、内部的には `PIXELS_PER_U` 定数 (デフォルト60px) に基づいて描画されます。

```typescript
interface KeyData {
  id: string;          // UUID
  position: {
    x: number;         // X座標 (U)
    y: number;         // Y座標 (U)
  };
  size: {
    w: number;         // 幅 (U)
    h: number;         // 高さ (U)
  };
  angle: number;       // 回転角度 (Degree)
  rotationCenter: {    // 回転中心 (現在はキーの中心を基準に計算)
    x: number;
    y: number;
  };
  legends: {           // 表示ラベル (4隅)
    tl: string;        // Top Left
    tr: string;        // Top Right
    bl: string;        // Bottom Left
    br: string;        // Bottom Right
  };
  matrix: {            // 電気的マトリクス位置
    row: number;
    col: number;
  };
  variant?: 'rect' | 'iso_enter' | 'stepped_caps' | 'bae'; // キー形状
  isSelected?: boolean;// (Runtime only) 選択状態
}
```

### ProjectData
プロジェクト全体の定義。LocalStorageに JSON として保存されます。

```typescript
interface ProjectData {
  id: string;          // UUID
  name: string;        // プロジェクト名
  keys: KeyData[];     // キーの配列
  createdAt: number;   // 作成日時 (Timestamp)
  updatedAt: number;   // 更新日時 (Timestamp)
}
```

## UI構成

1. **Top Bar**
   - ロゴ
   - プロジェクト名表示
   - **Undo / Redo ボタン**: 操作履歴の管理。
   - **Grid Size Selector**: グリッドスナップサイズの変更 (1U ~ 0.05U)。
   - **Add Key Count**: 一度に追加するキーの個数指定。
   - **Add Key ボタン**: キーをキャンバスに追加。
   - **Import / Export**: プロジェクトの JSON ファイル入出力。
   - **QMK Export**: QMK info.json のエクスポート。

2. **Left Sidebar**
   - **Presets**: 1U, 1.25U, 2U, Spacebar, ISO Enter などのプリセットキー。ドラッグ＆ドロップでキャンバスに追加可能。
   - **Projects**: 保存済みプロジェクトの一覧。切り替え・削除が可能。

3. **Main Canvas**
   - **操作エリア**: キーの配置を行うメイン領域。
   - **操作方法**:
     - 左クリック: キー選択
     - Shift+クリック: 複数選択
     - キャンバスドラッグ or 中クリックドラッグ: 視点移動 (Pan)
     - ホイール: ズーム (Zoom)
     - キードラッグ: 移動 (設定されたグリッドサイズにスナップ)
     - 回転ハンドルドラッグ: 回転

4. **Right Sidebar (Inspector)**
   - 選択中のキーのプロパティ編集フォーム。
   - **Properties**:
     - **Legends**: TL, TR, BL, BR の4箇所のテキスト入力。
     - **Shape**: キー形状の選択 (Rectangle, ISO Enter など)。
     - **Position**: X, Y 座標。
     - **Size**: Width, Height。
     - **Rotation**: 回転角度。
     - **Matrix**: Row, Col 座標。
   - **Tools**:
     - **Auto-assign Matrix**: 選択キー（または全キー）のマトリクス自動割り当て。
     - **Duplicate / Delete**: キーの複製・削除。

## 将来の拡張予定 (Phase 2以降)
- PCB設計ツール (KiCad) へのエクスポート
- テーマカラーのカスタマイズ
- Stepped Caps / BAE などの特殊形状の実装
