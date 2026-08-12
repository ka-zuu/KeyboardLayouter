# QMK Firmware

出力のみに対応します。生成するのは以下の 3 つです。

| ファイル | 内容 | 完成度 |
|---|---|---|
| `info.json` | レイアウト定義 (QMK Configurator が読む) | 実用レベル |
| `keymap.json` | キーマップ (QMK Configurator 形式) | **雛形のみ** (`KC_NO` 埋め) |
| `keymap.c` | キーマップ (C ソース) | **雛形のみ** (`KC_NO` 埋め) |

## スコープ

**キーコードの割り当てとレイヤ編集は本アプリの機能に含めません。**

- 本アプリは**物理レイアウトのエディタ**です。どのキーに何を割り当てるかは
  QMK Configurator / VIA / Vial / ソース編集の領分で、そちらの方が
  キーコードの網羅性・追従性で優れています。
- レイヤとキーコードをモデルに持たせると、データ構造・UI・テストの規模が
  倍近くになり、レイアウト編集そのものの品質を落とします。

そのため `keymap.c` / `keymap.json` は「キー数とレイアウト名が正しい空の雛形」を
出力するだけにします。ユーザーはこれを QMK のリポジトリに置き、キーコードだけを埋めます。
将来キーコード編集を追加する場合は ADR を追加してから着手してください。

## `info.json`

```jsonc
{
  "keyboard_name": "My Keyboard",
  "manufacturer": "Me",
  "maintainer": "me",
  "url": "https://example.com",
  "usb": {
    "vid": "0xFEED",
    "pid": "0x0000",
    "device_version": "0.0.1"
  },
  "diode_direction": "COL2ROW",
  "matrix_size": { "rows": 5, "cols": 14 },
  "layouts": {
    "LAYOUT": {
      "layout": [
        { "matrix": [0, 0], "x": 0, "y": 0, "label": "Esc" },
        { "matrix": [0, 1], "x": 1, "y": 0, "label": "1" },
        { "matrix": [0, 13], "x": 13, "y": 0, "w": 2, "label": "Backspace" }
      ]
    }
  }
}
```

- 値は `meta` ([../DATA_MODEL.md](../DATA_MODEL.md#型定義)) から取ります。
  旧アプリは `manufacturer: 'Unknown'` `maintainer: 'qmk'` `vid: '0xFEED'` を
  ハードコードしていました。本アプリではインスペクタから設定できます。
- `matrix_size` は使用中の最大 Row / Col + 1 から求めます。
- `matrix_pins` は**出力しません**。レイアウトから決められない情報です
  ([../MATRIX.md](../MATRIX.md#ピン割り当て))。エクスポート時にその旨を案内します。
- インデントは半角スペース 4 (旧アプリと同じ。QMK の慣例にも合う)。

### 各キーの出力規則

| フィールド | 規則 |
|---|---|
| `matrix` | `[row, col]`。`matrix === null` のキーはこのフィールドを省き、警告を出す |
| `x` / `y` | 正規化後の左上座標 (U)。常に出力 |
| `w` / `h` | **1 のときは省略** (QMK の既定値が 1 のため) |
| `label` | 主刻印。優先順位は `center` → `topCenter` → `topLeft` の最初に見つかったもの。空なら省略 |
| `r` | 回転角。0 のときは省略 |
| `rx` / `ry` | 回転原点 (絶対座標 U)。`r` を出すときのみ出力 |

### 回転原点の算出

QMK の `rx` / `ry` は**絶対座標**です。旧アプリ (`lib/qmk.ts`) と同じ式を使います。

```ts
// rotation.origin が null (幾何中心回転) の場合
rx = key.position.x + key.size.w / 2;
ry = key.position.y + key.size.h / 2;

// rotation.origin が指定されている場合はそのまま使う
rx = key.rotation.origin.x;
ry = key.rotation.origin.y;
```

QMK Configurator は `r` / `rx` / `ry` を「`(rx, ry)` を中心に `r` 度回転」と
解釈するため、幾何中心回転のキーは中心座標を渡す必要があります。

### 出力から除外するキー

- `decal: true` のキー (スイッチが存在しないため)
- どのキーも除外されない場合でも、`matrix === null` のキーがあれば
  「マトリクス未割り当てのキーが N 個あります」と警告します

## `keymap.json` (雛形)

```jsonc
{
  "keyboard": "my_keyboard",
  "keymap": "default",
  "layout": "LAYOUT",
  "layers": [
    ["KC_NO", "KC_NO", "KC_NO"]
  ]
}
```

- `layers` は 1 層のみ。要素数は出力対象のキー数と一致させます。
- `keyboard` はプロジェクト名を小文字化し、空白と記号を `_` にしたもの。

## `keymap.c` (雛形)

```c
// このファイルは自動生成された雛形です。
// KC_NO を実際のキーコードに置き換えてください。
#include QMK_KEYBOARD_H

const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
    [0] = LAYOUT(
        // row 0
        KC_NO, KC_NO, KC_NO, KC_NO,
        // row 1
        KC_NO, KC_NO, KC_NO, KC_NO
    ),
};
```

- キーの並び順は `info.json` の `layout` 配列と**同じ順序**にします。
  ここがずれると QMK 側で対応が取れなくなります。
- Row が変わるところに `// row N` のコメントを入れ、人が埋めやすくします。
- 刻印がある場合はコメントとして併記します (例: `KC_NO,  // Esc`)。

## 出力単位

エクスポートメニューからは 2 つの項目を出します。

| メニュー項目 | 出力 |
|---|---|
| QMK info.json | `info.json` 単体 |
| QMK キーボード一式 (zip) | `<keyboard_name>/info.json`, `<keyboard_name>/keymaps/default/keymap.c`, `<keyboard_name>/keymaps/default/keymap.json`, `README.md` (QMK への置き方の説明) |

zip 内の `README.md` には、QMK のリポジトリの `keyboards/` 以下に置く手順と、
`matrix_pins` を自分で設定する必要があることを書きます。

## テスト

`tests/fixtures/qmk/` にゴールデンファイルを置きます。

| フィクスチャ | 検証内容 |
|---|---|
| `ansi-104` | 基本の座標・`w` の省略・`label` |
| `rotated-thumb` | `r` / `rx` / `ry` の算出 (幾何中心回転と原点指定の両方) |
| `no-matrix` | `matrix === null` のキーがある場合の警告と省略 |
| `with-decal` | デカールが除外されること |
| `split` | 分割キーボードが 1 つの `LAYOUT` にまとまること |

`info.json` は JSON なので、文字列比較ではなくパースしたオブジェクトの
深い比較で検証します (整形の差でテストが落ちないように)。
