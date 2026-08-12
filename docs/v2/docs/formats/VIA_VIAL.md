# VIA / Vial

出力のみに対応します。VIA と Vial は「キーマップをリアルタイムに書き換える」
ツールで、キーボード定義ファイル (JSON) を必要とします。その定義ファイルのうち、
**レイアウト部分**を本アプリから出力します。

## VIA 定義 (`<name>.json`)

VIA の定義ファイルは、KLE raw JSON をそのまま `layouts.keymap` に埋め込む形式です。
つまり [KLE.md](KLE.md) のシリアライザをそのまま使えます。

```jsonc
{
  "name": "My Keyboard",
  "vendorId": "0xFEED",
  "productId": "0x0000",
  "matrix": { "rows": 5, "cols": 14 },
  "layouts": {
    "keymap": [
      ["0,0", "0,1", "0,2"],
      ["1,0", "1,1", "1,2"]
    ]
  }
}
```

### 重要な違い: 刻印がマトリクス座標になる

VIA では、`layouts.keymap` の各キーの**刻印 (KLE の最初の刻印) に
`"row,col"` を書きます**。VIA はこれを読んでキーとマトリクスの対応を取ります。

そのため出力時は:

1. モデルから KLE raw JSON を生成する
2. ただし各キーの刻印は、実際の刻印ではなく `"${row},${col}"` で置き換える
3. `a` は `4` (既定) で出力する

ユーザーが付けた刻印は VIA 定義には入りません (VIA 側でキーコードから表示するため)。
この点をエクスポート時に案内します。

### フィールドの対応

| VIA | 出典 |
|---|---|
| `name` | `meta.keyboardName` |
| `vendorId` | `meta.usb.vid` |
| `productId` | `meta.usb.pid` |
| `matrix.rows` / `matrix.cols` | 使用中の最大 Row / Col + 1 |
| `layouts.keymap` | KLE シリアライザの出力 (刻印をマトリクス座標に置換) |

`menus` / `customKeycodes` / `lighting` は出力しません (レイアウトから決まらない情報)。

## Vial

Vial は VIA 定義を拡張したもので、追加で以下が必要です。

| フィールド | 本アプリでの扱い |
|---|---|
| `vial.uid` | ランダムな 64bit 値を生成して出力。Vial では一意な ID が必要 |
| `vial.keyboardName` | `meta.keyboardName` |
| `matrix` | VIA と同じ |
| `layouts` | VIA と同じ |

Vial のタップダンス・コンボ・マクロの設定は出力しません。

Vial 用のファイルは `vial.json` として、VIA 用とは別のメニュー項目から出力します。

## 前提条件

- **マトリクスが全キーに割り当てられていること**。未割り当てがあれば
  エラーにして出力を中止します (VIA は `"row,col"` を必須とするため)。
- `decal: true` のキーは出力しません。

## テスト

`tests/fixtures/via/` にゴールデンファイルを置きます。

| フィクスチャ | 検証内容 |
|---|---|
| `4x4-macropad` | 刻印がマトリクス座標に置き換わること |
| `ansi-104` | `matrix.rows` / `matrix.cols` の算出 |
| `no-matrix` | 未割り当てがあるときにエラーになること |
| `vial-uid` | `vial.uid` が出力されること (乱数は固定して比較) |

`vial.uid` の生成もテスト用に差し替えられるようにします
([KICAD.md](KICAD.md#バスとラベル) の UUID と同じ考え方)。
