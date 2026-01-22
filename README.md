# Modern Keyboard Layout Editor (MKD)

## 概要
MKD (Modern Keyboard Layout Editor) は、既存のKeyboard Layout Editor (KLE) の代替を目指して開発された、モダンで直感的な自作キーボード用レイアウト設計ツールです。
React (Next.js) と Konva.js を活用し、ブラウザ上でドラッグ＆ドロップによるスムーズな操作を実現しています。

## 特徴
- **直感的な操作**: 無限キャンバス上でのドラッグ＆ドロップによるキー配置、回転ハンドルによる直感的な角度調整。
- **モダンなUI**: Tailwind CSSによる洗練されたダークモードインターフェース。
- **データ管理**: プロジェクトごとの自動保存 (LocalStorage)。
- **履歴管理**: Undo / Redo 機能。
- **外部連携**: JSON インポート/エクスポート、QMK info.json エクスポート。

## 技術スタック
- **Framework**: Next.js 16 (App Router)
- **Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Canvas Library**: React Konva (Konva.js)
- **State Management**: Zustand (Middleware: Persist, Temporal)
- **Icons**: Lucide React

## 機能

### 1. キャンバス機能
- **無限キャンバス**: マウスホイールによるズーム、中クリック（またはドラッグ）によるパン操作。
- **グリッドシステム**: 1U, 0.5U, 0.25U, 0.125U, 0.05U のスナップ機能。
- **Drag & Drop**: サイドバーのプリセットからキーをドラッグして追加。

### 2. キー操作・プロパティ
各キーは以下のプロパティを持ち、右サイドバーのインスペクターで編集可能です。
- **Position (X, Y)**: キーの位置 (単位: U)。
- **Size (W, H)**: キーのサイズ (単位: U)。
- **Rotation**: 角度 (Degree)。選択時のハンドル操作でも変更可能。
- **Legends**: キーの刻印（TL, TR, BL, BR の4箇所）。
- **Matrix (Row, Col)**: ファームウェア用マトリクス座標。自動割り当て機能あり。
- **Shape**: キー形状の選択（Rectangle, ISO Enter）。

### 3. プロジェクト管理
- **自動保存**: LocalStorageにリアルタイムで保存されます。
- **プロジェクト一覧**: 左サイドバーからプロジェクトの切り替え、新規作成、削除が可能。
- **Import / Export**: プロジェクトデータの JSON ファイルへの書き出し・読み込み。
- **QMK Export**: QMK Firmware 用の `info.json` 生成。

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスしてください。
