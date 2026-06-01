# MKD (Modern Keyboard Layout Editor) 仕様書

## 1. アーキテクチャ概要

MKDは、**Next.js 16 (App Router)** と **React 19** をベースに構築されたクライアントサイド重視のWebアプリケーションです。キーボードレイアウトの描画には **Konva.js** (`react-konva`) を使用し、高性能な2Dキャンバス操作を実現しています。

### 技術スタック
- **Framework**: Next.js 16.1.1
- **UI Library**: React 19.2.3
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS 4.1
- **Canvas Engine**: Konva 10.0.12 / react-konva 19.2.1
- **State Management**: Zustand 5.0.9
- **Undo/Redo**: Zundo 2.3.0
- **Storage**: IndexedDB (native) with custom adapter
- **Icons**: Lucide React

## 2. データモデル

アプリケーションの状態は Zustand ストアで一元管理され、`ProjectData` 型として永続化されます。

### ProjectData
```typescript
interface ProjectData {
  id: string;          // UUID v4
  name: string;        // プロジェクト名
  keys: KeyData[];     // キー配列
  createdAt: number;   // 作成日時 (タイムスタンプ)
  updatedAt: number;   // 更新日時 (タイムスタンプ)
}
```

### KeyData
各キーは物理的なスイッチに対応します。
```typescript
interface KeyData {
  id: string;          // UUID v4
  position: {
    x: number;         // X座標 (単位: U)
    y: number;         // Y座標 (単位: U)
  };
  size: {
    w: number;         // 幅 (単位: U, 例: 1, 1.5, 2.25)
    h: number;         // 高さ (単位: U)
  };
  angle: number;       // 回転角度 (度)
  rotationCenter: {
    x: number;         // 回転中心の相対Xオフセット (通常 0,0)
    y: number;         // 回転中心の相対Yオフセット
  };
  legends: {
    top: string;       // メイン刻印
    bottom: string;    // サブ刻印
    left: string;      // 左側刻印
    right: string;     // 右側刻印
  };
  matrix: {
    row: number;       // 電気的マトリクスの行インデックス
    col: number;       // 電気的マトリクスの列インデックス
  };
  variant?: KeyVariant; // キー形状 'rect' | 'iso_enter' | 'stepped_caps' (省略時 'rect')
                        // 現状キャンバス描画は 'rect' と 'iso_enter' のみ対応。
                        // 'stepped_caps' は未実装 (矩形として描画)。
  isSelected?: boolean; // 選択状態 (UI 用の一時フラグ)
}
```

## 3. 状態管理とストレージ

### ストア設計
- **Zustand**: グローバル状態 (`project`, `selection`, `zoom/pan`) を管理。
- **Zundo (`temporal`)**: 状態の履歴を追跡し、Undo/Redo機能を提供。
- **Shallow Comparison**: `useShallow` を使用して、ドラッグ操作などの高頻度更新時の不要な再レンダリングを防止。

### ストレージ戦略 (IndexedDB)
大規模なプロジェクトをメインスレッドをブロックせずに保存し、`localStorage` の容量制限 (5MB) を回避するために以下の戦略を採用しています：
1. **プライマリストレージ**: `IndexedDB` (Database: `mkd-db`, Store: `keyval`)。
2. **デバウンス**: ディスクI/Oの負荷を軽減するため、書き込みは1000msのデバウンスを経て実行されます。
3. **フォールバック**: IndexedDBが利用できない場合、自動的に `localStorage` にフォールバックします。
4. **マイグレーション**: 初回ロード時に `localStorage` にデータが存在し、`IndexedDB` にない場合、自動的に移行処理が行われます。

## 4. 座標系とジオメトリ

### 内部座標
- **Unit (U)**: 基本単位。標準的なキーサイズは 1U x 1U です。
- **Grid**: キーはグリッドにスナップします (デフォルト 0.25U, 最小 0.05U まで調整可能)。

### ビジュアル座標 (Canvas)
- **Pixels**: 描画上のピクセル換算。拡大縮小は Konva `Stage` のスケールで処理されます。

### 物理座標 (KiCad / QMK)
- **Scale**: `1U = 19.05mm` と定義。
- **Y軸**: 下方向が正 (Y-Down)。
- **回転**:
  - **Visual**: キーごとの `rotationCenter` (相対座標) を中心に回転。
  - **QMK**: 絶対座標としての `rx`, `ry` が必要。
  - **KiCad**: コンポーネントはその中心に配置され、挿入点を中心に回転。

## 5. 機能とアルゴリズム

### マトリクス自動割り当て (Auto-Assign)
物理的な配置に基づいて、電気的な行(Row)/列(Col)を自動的に割り当てます。
1. **ソート**: キーをY座標順（わずかなズレを許容する許容値あり）にソートし、次にX座標順にソートします。
2. **割り当て**: ソートされたキー順に列インデックスをインクリメントし、Y座標が大きく変わるタイミングで行インデックスを更新して列をリセットします。

### 衝突判定 (選択機能)
1. **AABB Check**: 回転していないキーに対しては、高速な軸平行バウンディングボックス判定を行います。
2. **Bounding Circle**: 回転しているキーに対しては、まず選択範囲がキーの包含円と交差するかを判定します。
3. **SAT (分離軸判定法)**: 円判定を通過した場合、多角形同士の正確な交差判定を行います。

### エクスポート形式

#### 1. JSON
- `ProjectData` オブジェクトの生データダンプ。

#### 2. QMK (`info.json`)
- `layouts.LAYOUT.layout` 配列を生成。
- QMK Configurator 互換のために `rx`, `ry` (回転原点) を計算:
  ```typescript
  rx = key.x + key.w/2 + rotationCenter.x
  ry = key.y + key.h/2 + rotationCenter.y
  ```

#### 3. KiCad エクスポート (`.zip`)
KiCadプロジェクト一式 (`.kicad_sch`, `.kicad_pcb`, `.kicad_pro`) を生成します。
- **形式**: S-Expression (`.kicad_sch`, `.kicad_pcb`) および JSON (`.kicad_pro`).
- **注意**: PCB (`.kicad_pcb`) エクスポートは開発中です。現状はスイッチのフットプリント配置のみを行い、ダイオード配置・ネット/配線の出力は未対応です。
- **回路図 (`.kicad_sch`)**:
  - マトリクスグリッドを生成。
  - `ROW_x`, `COL_y` のグローバルラベルを配置。
  - スイッチとダイオードを `Row -> Switch -> Diode -> Col` のトポロジーで結線。
  - 外部ライブラリ依存を避けるため、シンボル定義 (`kbd:SW_PUSH`, `Device:D`) を `lib_symbols` に埋め込み。
- **PCB (`.kicad_pcb`)** (開発中):
  - フットプリント (`Button_Switch_Keyboard:SW_Cherry_MX_1.00u_Plate`) を物理座標 `(x * 19.05mm, y * 19.05mm)` に配置。
  - 回転を適用。
  - UUIDを使用して回路図コンポーネントとリンク。
