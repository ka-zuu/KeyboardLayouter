# 入出力フォーマット

本アプリの価値は「レイアウトを他ツールが読める形で書き出せること」にあります。
出力の正しさは**ゴールデンファイル比較**で守ります ([../TESTING.md](../TESTING.md))。

## 対応表

| 形式 | 入力 | 出力 | 実装 | 仕様 |
|---|---|---|---|---|
| プロジェクト JSON (独自) | ✅ | ✅ | `src/io/project/` | [PROJECT_JSON.md](PROJECT_JSON.md) |
| KLE raw JSON | ✅ | ✅ | `src/io/kle/` | [KLE.md](KLE.md) |
| QMK `info.json` | – | ✅ | `src/io/qmk/` | [QMK.md](QMK.md) |
| QMK `keymap.c` / `keymap.json` (雛形) | – | ✅ | `src/io/qmk/` | [QMK.md](QMK.md) |
| KiCad プロジェクト zip | – | ✅ | `src/io/kicad/` | [KICAD.md](KICAD.md) |
| VIA / Vial 定義 | – | ✅ | `src/io/via/` | [VIA_VIAL.md](VIA_VIAL.md) |
| Ergogen YAML | – | ✅ | `src/io/ergogen/` | [ERGOGEN.md](ERGOGEN.md) |

## 変換の構造

すべての変換は `ProjectModel` ([../DATA_MODEL.md](../DATA_MODEL.md)) を経由します。
形式同士の直接変換 (KLE → QMK など) は書きません。

```
KLE raw JSON ──parse──┐                        ┌──serialize──> KLE raw JSON
                      ├──> ProjectModel ───────┼──serialize──> QMK info.json
プロジェクト JSON ─────┘                        ├──serialize──> KiCad zip
                                               ├──serialize──> VIA 定義
                                               └──serialize──> Ergogen YAML
```

各モジュールは同じ形のインタフェースを持ちます。

```ts
export interface ParseResult {
  project: ProjectModel;
  /** 変換で落ちた情報・推測した箇所。UI でユーザーに見せる。 */
  warnings: FormatWarning[];
}

export interface FormatWarning {
  /** 'unsupported-property' | 'missing-matrix' | 'lossy-conversion' など */
  code: string;
  message: string;
  /** 該当キーの id (キーに紐づかない警告では null) */
  keyId: string | null;
}

export interface SerializeResult {
  /** ファイル名 → 内容。zip 出力では複数のエントリを返す。 */
  files: { name: string; content: string | Uint8Array }[];
  warnings: FormatWarning[];
}
```

**警告を黙って捨てないこと。** 変換で情報が落ちる場合は必ず `warnings` に積み、
UI がトーストで見せます。旧アプリはインポート失敗を `alert('Failed to parse JSON')`
の一言で片付けていました。

## 入力の判別

取込は 1 つのファイル選択ダイアログから行い、内容で形式を判別します。

| 判定 | 形式 |
|---|---|
| オブジェクトで `schemaVersion` を持つ | プロジェクト JSON |
| オブジェクトで `keys` 配列を持ち `schemaVersion` が無い | 旧 MKD プロジェクト JSON ([../MIGRATION_FROM_MKD.md](../MIGRATION_FROM_MKD.md)) |
| 配列で、要素が配列または (先頭のみ) オブジェクト | KLE raw JSON |
| オブジェクトで `layouts` を持つ | KLE の kbd.json (メタ情報付き) として KLE パーサに渡す |

判別できない場合はエラーにし、「対応形式: …」を並べて示します。
拡張子は判断材料にしません (`.json` ばかりで区別できないため)。

## ラウンドトリップの保証範囲

| 経路 | 保証 |
|---|---|
| プロジェクト JSON → モデル → プロジェクト JSON | **完全一致** (`updatedAt` を除く) |
| KLE → モデル → KLE | **意味的に同値** (キーの座標・寸法・回転・刻印・色が一致。プロパティの並び順や省略の仕方は異なってよい) |
| KLE → モデル → KLE → モデル | **モデルが完全一致** (べき等) |

「意味的に同値」の判定は、両者を再度パースしてモデル同士を比較する方法で行います
(文字列比較ではなく)。テスト方法は [../TESTING.md](../TESTING.md#ラウンドトリップテスト) 参照。

## 情報の欠落一覧

モデルが持つ情報のうち、各形式で表現できないものです。出力時に警告を出します。

| モデルの情報 | KLE | QMK | KiCad | VIA | Ergogen |
|---|---|---|---|---|---|
| 座標 / 寸法 / 回転 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 12 スロットの刻印 | ✅ | 主刻印のみ | ❌ | ✅ | ❌ |
| マトリクス Row/Col | ❌ | ✅ | ✅ | ✅ | ❌ |
| 形状 (ISO Enter 等) | ✅ | 副矩形は表現不可 | フットプリント選択に反映 | ✅ | ❌ |
| 色 | ✅ | ❌ | ❌ | ✅ (一部) | ❌ |
| デカール | ✅ | 除外 | 除外 | 除外 | 除外 |
| ホーミング | ✅ | ❌ | ❌ | ❌ | ❌ |
| キーボードのメタ情報 | 一部 | ✅ | 一部 | ✅ | ❌ |

**KLE はマトリクス情報を持ちません。** KLE から取り込んだレイアウトは
マトリクスが未割り当てになるため、自動割り当てを実行するよう案内します
([../MATRIX.md](../MATRIX.md))。

## 出力時の共通ルール

- **正規化**: 全キーの AABB 左上が原点になるよう平行移動してから出力します
  (負座標のまま出すと QMK も KiCad も扱いに困るため)。プロジェクト内のデータは
  変更しません。
- **`decal` のキーはスイッチを持つ形式から除外**します (QMK / KiCad / VIA)。
- **キーの順序**: Y → X の順に並べ替えて出力します。マトリクス割り当て済みなら
  Row → Col の順を優先します。順序が安定しないとゴールデンファイル比較ができません。
- **数値の丸め**: 座標は小数第 4 位まで。mm 換算値は小数第 4 位まで
  (`toFixed(4)`)。指数表記を出さないこと。
- **改行コードは LF**、末尾に改行 1 つ。文字コードは UTF-8 (BOM なし)。
- **ファイル名**: プロジェクト名の空白を `_` に置換したものを基本とします。
  形式ごとの規定ファイル名 (`info.json` 等) がある場合はそちらに従います。
