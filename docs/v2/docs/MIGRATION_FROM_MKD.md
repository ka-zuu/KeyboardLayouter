# 旧アプリ (MKD) からの移行

旧アプリ = Next.js + React + Konva 版の Modern Keyboard Layout Editor (MKD)。
そのデータを本アプリで読めるようにします。**ユーザーの作業を失わせないこと**が目的です。

移行元は 2 つあります。

1. 旧アプリがエクスポートした JSON ファイル
2. 同じブラウザに残っている旧アプリの IndexedDB / localStorage

## 旧データの形

旧アプリの `types/mkd.ts`:

```ts
interface KeyData {
  id: string;
  position: { x: number; y: number };   // U
  size: { w: number; h: number };       // U
  angle: number;                        // 度
  rotationCenter: { x: number; y: number };  // キー左上からの相対。実際は常に {0,0}
  legends: { top: string; bottom: string; left: string; right: string };
  matrix: { row: number; col: number };
  variant?: 'rect' | 'iso_enter' | 'stepped_caps';
  isSelected?: boolean;
}

interface ProjectData {
  id: string;
  name: string;
  keys: KeyData[];
  createdAt: number;
  updatedAt: number;
}
```

`schemaVersion` が無いため、**`schemaVersion` の有無で新旧を判別**します
([formats/README.md](formats/README.md#入力の判別))。

## 変換規則 (`migrateV0ToV1`)

| 旧 | 新 | 変換 |
|---|---|---|
| `position` | `position` | そのまま |
| `size` | `size` | そのまま |
| `angle` | `rotation.angle` | そのまま |
| `rotationCenter` | `rotation.origin` | **常に `null`**。旧アプリのキャンバス描画は幾何中心回転で、`rotationCenter` は使われていなかったため。値が `{0,0}` 以外だった場合は警告を出す |
| `legends.top` | `legends.topCenter` | 空文字なら省略 |
| `legends.bottom` | `legends.bottomCenter` | 同上 |
| `legends.left` | `legends.centerLeft` | 同上 |
| `legends.right` | `legends.centerRight` | 同上 |
| `matrix` | `matrix` | そのまま (`{0,0}` も割り当て済みとして扱う。下記参照) |
| `variant: 'rect'` / 未指定 | `shape: 'rect'` | `secondary: null` |
| `variant: 'iso_enter'` | `shape: 'isoEnter'` | 副矩形を補う (下記) |
| `variant: 'stepped_caps'` | `shape: 'steppedCaps'` | 副矩形を補う |
| `isSelected` | (破棄) | UI 状態なので永続データから外す |
| (なし) | `polygon` | `null` |
| (なし) | `decal` / `homing` / `ghost` | `false` |
| (なし) | `color` / `legendColor` | `null` |
| (なし) | `side` | `'single'` |
| `id` / `name` / `createdAt` / `updatedAt` | 同名 | そのまま |
| (なし) | `schemaVersion` | `1` |
| (なし) | `meta` | 既定値 (`createProject()` と同じ。`keyboardName` は `name` を使う) |

### マトリクスの扱い

旧アプリでは新規キーの `matrix` が `{ row: 0, col: 0 }` で作られるため、
「未割り当てのまま放置されたキー」も `{0,0}` を持っています。
これを機械的に判別することはできません。そこで:

- 値はそのまま `{ row: 0, col: 0 }` として引き継ぐ (勝手に `null` にしない)
- **`{0,0}` を持つキーが 2 個以上ある場合**は、マトリクスが未設定である可能性が高いため
  「マトリクスが重複しています。自動割り当ての実行をおすすめします」と警告を出す

### ISO Enter / ステップドの副矩形

旧アプリは `variant` だけを持ち、副矩形の情報がありません。
描画は 1.5U×2U の固定形状 (`ISO_ENTER_PATH`) でした。移行では標準的な副矩形を補います。

| `shape` | 主矩形 | 副矩形 (相対 U) |
|---|---|---|
| `isoEnter` | 旧 `size` をそのまま (通常 1.5×2) | `{ x: 0.25, y: 1, w: 1.25, h: 1 }` |
| `steppedCaps` | 旧 `size` をそのまま | `{ x: 0, y: 0, w: size.w * 0.75, h: size.h }` |

補完したことを警告に出し、インスペクタで直せることを案内します。

## 旧アプリの内部マイグレーションも引き継ぐ

旧アプリ自身が、さらに古い形式からの変換を `loadProject` の中に持っていました。
本アプリでもそれらを読めるようにします (エクスポート済みのファイルが
古い形のまま残っている可能性があるため)。

| さらに古い形 | 変換先 |
|---|---|
| `visualLegend: string` | `legends.topCenter` |
| `legends.tl` | `legends.topCenter` |
| `legends.tr` | `legends.centerRight` |
| `legends.bl` | `legends.centerLeft` |
| `legends.br` | `legends.bottomCenter` |
| `legends` 自体が無い | 空の `legends` |

(旧アプリの変換規則をそのまま踏襲しています。`tl/tr/bl/br` → `top/right/left/bottom`
の対応は旧実装に合わせたもので、直感的な対応とは異なる点に注意してください。)

## ブラウザに残ったデータの取り込み

旧アプリと本アプリが**同じオリジンで動く場合**に限り、起動時に旧データを探します。
本アプリは v1 と同じ Vercel の本番 URL (`keyboard-layouter.vercel.app`) で
配信を継続するため ([adr/0001-tech-stack.md](adr/0001-tech-stack.md))、
**本番切り替え後は自動取り込みが機能します**。

| 保存先 | キー |
|---|---|
| IndexedDB | データベース `mkd-db` / ストア `keyval` / キー `mkd-storage` |
| localStorage | キー `mkd-storage` |

見つかった場合の挙動:

1. 本アプリのデータが空のとき — 自動で取り込み、「旧バージョンのプロジェクト N 件を
   読み込みました」と表示する。
2. 本アプリのデータが既にあるとき — 自動では触らず、
   「旧バージョンのデータが見つかりました。読み込みますか?」と確認する。
3. どちらの場合も**旧データは削除しない**。取り込みが失敗したときに
   戻れるようにするため。

### 別オリジンでは機能しないことに注意

- **Vercel の Preview デプロイ** (`<project>-<hash>.vercel.app`) は本番と別オリジンなので、
  開発中の確認では旧データが見えません。この経路の動作確認は
  [BOOTSTRAP.md](BOOTSTRAP.md#8-vercel-へのデプロイ) の本番切り替え後に行います。
- 上記以外の理由で別オリジンにデプロイする場合 (フォーク、別サービスへの移設等) も
  自動取り込みができません。その場合はユーザーに旧アプリから JSON をエクスポートして
  もらい、本アプリの取込機能で読み込んでもらいます。その手順を README の
  「旧バージョンからの移行」節に書きます。

## テスト

`tests/fixtures/project/v0/` に旧形式のサンプルを置きます。

| フィクスチャ | 検証内容 |
|---|---|
| `mkd-basic.json` | 4 面刻印・矩形キーの基本変換 |
| `mkd-iso-enter.json` | `variant: 'iso_enter'` の副矩形補完 |
| `mkd-stepped.json` | `variant: 'stepped_caps'` の副矩形補完 |
| `mkd-rotated.json` | `angle` と `rotationCenter` の扱い |
| `mkd-legacy-visual-legend.json` | `visualLegend` からの変換 |
| `mkd-legacy-tlbr.json` | `tl/tr/bl/br` からの変換 |
| `mkd-all-zero-matrix.json` | `{0,0}` 重複の警告 |
| `mkd-with-selected.json` | `isSelected` が破棄されること |

**これらのフィクスチャは消さないこと。** 旧データが読めることの唯一の保証です
([formats/PROJECT_JSON.md](formats/PROJECT_JSON.md#移行処理))。
