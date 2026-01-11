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
  visualLegend: string;// 表示ラベル
  matrix: {            // 電気的マトリクス位置
    row: number;
    col: number;
  };
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
   - "Add Key" ボタン (デフォルト1Uキーを追加)
   - (未実装: Import/Export ボタン)

2. **Left Sidebar**
   - **Presets**: 1U, 1.25U, 2U, Spacebar などのプリセットキー。ドラッグ＆ドロップでキャンバスに追加可能。
   - **Projects**: 保存済みプロジェクトの一覧。切り替え・削除が可能。

3. **Main Canvas**
   - **操作エリア**: キーの配置を行うメイン領域。
   - **操作方法**:
     - 左クリック: キー選択
     - Shift+クリック: 複数選択
     - キャンバスドラッグ or 中クリックドラッグ: 視点移動 (Pan)
     - ホイール: ズーム (Zoom)
     - キードラッグ: 移動 (0.25U スナップ)
     - 回転ハンドルドラッグ: 回転

4. **Right Sidebar (Inspector)**
   - 選択中のキーのプロパティ編集フォーム。
   - X, Y, W, H, Rotation, Legend, Matrix Row/Col の数値入力が可能。
   - 複数選択時の複製・削除アクション。

## 将来の拡張予定 (Phase 2以降)
- キーデータの Import/Export (Raw JSON data, QMK Info.json互換性など)
- ISO Enter や L字型キーなどの特殊形状サポート
- PCB設計ツール (KiCad) へのエクスポート
- テーマカラーのカスタマイズ
