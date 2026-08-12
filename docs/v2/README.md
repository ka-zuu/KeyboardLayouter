# KeyboardLayouter v2

> **注意**: `KeyboardLayouter v2` は仮の名称です。正式名称の決定後、
> 名称の差し替え手順は [`docs/README.md`](docs/README.md#名称の差し替え) を参照してください。

自作キーボードの**物理レイアウト**を設計し、ファームウェア・基板設計の各ツールが
読める形式に書き出すためのブラウザアプリです。
[Keyboard Layout Editor (KLE)](http://www.keyboard-layout-editor.com/) の代替として使え、
そこから QMK Firmware / KiCad / VIA / Ergogen へ橋渡しすることを目的にしています。

サーバーを持たない完全なクライアントサイド SPA で、データはブラウザ内 (IndexedDB) に保存されます。

## 主な機能

### レイアウト編集
- 無限キャンバス上でのキー配置。パン / ズーム、グリッドスナップ (1U〜0.05U)
- 矩形選択・追加選択、複数キーの一括移動 / 複製 / 削除
- キー単位の回転と、複数選択時のオービット回転
- キーごとのプロパティ編集: 刻印 (12 スロット)、サイズ、座標、回転、形状 (矩形 / ISO Enter /
  ステップド)、マトリクス Row/Col
- 電気マトリクスの自動割り当て (物理配置から Row/Col を推定)
- Undo / Redo、自動保存、複数プロジェクトの保存と切り替え

### 入出力
| 形式 | 入力 | 出力 | 仕様 |
|---|---|---|---|
| プロジェクト JSON (独自) | ✅ | ✅ | [docs/formats/PROJECT_JSON.md](docs/formats/PROJECT_JSON.md) |
| KLE raw JSON | ✅ | ✅ | [docs/formats/KLE.md](docs/formats/KLE.md) |
| QMK `info.json` | – | ✅ | [docs/formats/QMK.md](docs/formats/QMK.md) |
| QMK `keymap.c` / `keymap.json` (雛形のみ) | – | ✅ | [docs/formats/QMK.md](docs/formats/QMK.md) |
| KiCad プロジェクト (`.kicad_sch` / `.kicad_pcb` / `.kicad_pro` の zip) | – | ✅ | [docs/formats/KICAD.md](docs/formats/KICAD.md) |
| VIA / Vial 定義 | – | ✅ | [docs/formats/VIA_VIAL.md](docs/formats/VIA_VIAL.md) |
| Ergogen YAML | – | ✅ | [docs/formats/ERGOGEN.md](docs/formats/ERGOGEN.md) |

キーコードの割り当てとレイヤ編集は**本アプリの対象外**です。QMK keymap は
`KC_NO` で埋めた雛形を出力するだけで、実際のキーコードは QMK 側で編集します
(理由は [docs/formats/QMK.md](docs/formats/QMK.md#スコープ) 参照)。

## 技術スタック

- React 19 + TypeScript (strict)
- Vite (静的 SPA ビルド)
- キャンバス描画は SVG ベースの自前レンダラ (キャンバス描画ライブラリに依存しない)
- 状態管理: Zustand + 独自の履歴 (Undo/Redo) 層
- 永続化: IndexedDB (`localStorage` フォールバック付き)
- テスト: Vitest (ユニット) / Playwright (E2E)
- 配信: GitHub Pages

選定理由は [docs/adr/](docs/adr/) を参照してください。

## セットアップ

```bash
# 必要環境: Node.js 22 以上
npm ci
npm run dev        # http://localhost:5173
```

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー |
| `npm run build` | 本番ビルド (`dist/`) |
| `npm run preview` | ビルド結果のローカル確認 |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (ユニット) |
| `npm run test:e2e` | Playwright (E2E) |

新規にリポジトリを立ち上げる手順は [docs/BOOTSTRAP.md](docs/BOOTSTRAP.md) にあります。

## 対応ブラウザ

最新版の Chrome / Edge / Firefox / Safari。IndexedDB と Pointer Events が前提です。
モバイルはピンチによるパン・ズームと選択までを対象とし、細かなプロパティ編集は
デスクトップを想定します。

## ドキュメント

- [docs/README.md](docs/README.md) — ドキュメント全体の索引と読む順番

## ライセンス

未定 (リポジトリ作成時に決定し、`LICENSE` を追加してください)。
