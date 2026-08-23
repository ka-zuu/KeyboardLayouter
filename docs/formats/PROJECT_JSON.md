# プロジェクト JSON (独自形式)

本アプリの保存・共有形式です。`ProjectModel` ([../DATA_MODEL.md](../DATA_MODEL.md)) を
そのまま JSON にしたもので、**唯一の可逆形式**です。

## 例

```json
{
  "schemaVersion": 1,
  "id": "3f2a1b4c-5d6e-4f70-8a91-b2c3d4e5f607",
  "name": "My Keyboard",
  "keys": [
    {
      "id": "8c7b6a59-4d3e-4f21-9a0b-1c2d3e4f5a6b",
      "position": { "x": 0, "y": 0 },
      "size": { "w": 1, "h": 1 },
      "rotation": { "angle": 0, "origin": null },
      "shape": "rect",
      "secondary": null,
      "polygon": null,
      "legends": { "topCenter": "Esc" },
      "matrix": { "row": 0, "col": 0 },
      "decal": false,
      "homing": false,
      "ghost": false,
      "color": null,
      "legendColor": null,
      "side": "single"
    }
  ],
  "meta": {
    "keyboardName": "My Keyboard",
    "manufacturer": "",
    "maintainer": "",
    "url": "",
    "usb": { "vid": "0xFEED", "pid": "0x0000", "deviceVersion": "0.0.1" },
    "diodeDirection": "COL2ROW",
    "split": false
  },
  "createdAt": 1767225600000,
  "updatedAt": 1767225600000
}
```

- インデントは半角スペース 2。
- キーの並び順は Y → X (出力の共通ルール、[README.md](README.md#出力時の共通ルール))。
- ファイル名は `<プロジェクト名の空白を _ に置換>.json`。

## ファイル出力と IndexedDB の関係

同じ形を使いますが、用途が違います。

| | ファイル出力 | IndexedDB |
|---|---|---|
| 中身 | `ProjectModel` 単体 | プロジェクト辞書 (`id` → `ProjectModel`) + 現在のプロジェクト id + 編集設定 |
| 正規化 | する (原点合わせ) | しない (編集中の座標をそのまま保つ) |
| 目的 | 共有・バックアップ | 作業状態の保持 |

IndexedDB のキー構成:

| キー | 内容 |
|---|---|
| `projects` | `Record<string, ProjectModel>` |
| `currentProjectId` | `string` |
| `editorPrefs` | `{ gridSize, snapEnabled, theme }` |

## バージョニング

### `schemaVersion` を上げるとき

保存済みデータをそのまま読めなくなる変更をしたときだけ上げます。

| 変更 | `schemaVersion` |
|---|---|
| 省略可能なフィールドの追加 (既定値で補える) | 上げない |
| フィールドの削除・改名 | 上げる |
| 値の意味の変更 (単位・符号・基準点) | 上げる |
| 必須フィールドの追加 | 上げる |

### 移行処理

`src/core/model/migrate.ts` に、版から版への関数を並べて置きます。

```ts
type Migration = (raw: unknown) => unknown;

/** 版 N から N+1 への変換。添字が変換前の版に対応する。 */
const migrations: Record<number, Migration> = {
  0: migrateV0ToV1, // 旧 MKD 形式 (schemaVersion なし) からの変換
};

/**
 * 任意の版のデータを現在の版まで順に変換する。
 * 未知の (現在より新しい) 版は読み込みを拒否する。
 */
export function migrate(raw: unknown): ProjectModel;
```

- 移行は**読み込み時の副作用にしない**こと。`migrate` は純関数で、
  ストアの外で完結します。旧アプリは `loadProject` アクションの中に
  移行処理が埋め込まれていて、テストも移行だけを対象にできませんでした。
- 移行後は必ず検証を通します (下記)。
- 版ごとの入力サンプルを `tests/fixtures/project/v<N>/` に置き、
  現在の版への変換結果をゴールデンファイルで固定します。
  **過去のサンプルは消さないこと。** 古いデータが読めることの唯一の保証です。

### 前方互換 (新しい版のファイルを読んだとき)

`schemaVersion` が実装より新しい場合は、**読み込みを拒否**します。
「このファイルは新しいバージョンのアプリで作られています
(ファイル: 版 3 / このアプリ: 版 2)。アプリを更新してください」と表示します。
部分的に読める前提で壊れたデータを作る方が害が大きいためです。

## 検証

読み込んだデータは必ず検証します。信用しない前提で書くこと
(ユーザーが手で編集したファイル、他ツールが吐いたファイルが来ます)。

```ts
export interface ValidationIssue {
  path: string;      // 'keys[3].size.w'
  message: string;
  /** 'error' は読み込み中止、'warning' は repairProject で自動修復のうえ続行。 */
  severity: 'error' | 'warning';
}

export function validateProject(value: unknown): ValidationIssue[];

/** severity: 'warning' の issue を自動修復する (id の振り直し、shape を rect に統一 等)。 */
export function repairProject(project: ProjectModel, deps?: ModelDeps): { project: ProjectModel; warnings: ValidationIssue[] };
```

検証項目は [../DATA_MODEL.md](../DATA_MODEL.md#不変条件) の不変条件に対応します。
`severity: 'error'` の issue が 1 件でも残る場合は読み込みを中止し、`'warning'` だけなら
`repairProject` で直したうえで読み込みを続けます。

| 検査 | 不整合時の扱い | severity |
|---|---|---|
| 必須フィールドの有無・型 | エラー (読み込み中止) | error |
| `id` の重複 | 重複した方に新しい UUID を振り、警告 | warning |
| `size.w <= 0` / `size.h <= 0` | エラー | error |
| `shape` と `secondary` / `polygon` の整合 | `shape` を `rect` に落として警告 | warning |
| 未知のフィールド | 無視する (前方互換のため。エラーにしない) | – |
| `NaN` / `Infinity` | エラー | error |

スキーマ検証ライブラリ (zod 等) は導入しません。検証対象が 1 つの型だけで、
手書きの検証関数の方が「どう直すか」を細かく制御できるためです。
