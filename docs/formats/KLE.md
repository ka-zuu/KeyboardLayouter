# KLE raw JSON

[Keyboard Layout Editor](http://www.keyboard-layout-editor.com/) の "Raw data" 形式。
**本アプリが KLE の代替として使えるための最重要要件**であり、入力・出力の両方に対応します。
旧アプリには未実装でした。

参照実装は [ijprest/kle-serial](https://github.com/ijprest/kle-serial) です。
`labelMap` などの表はここから写しています。挙動に迷ったら参照実装に合わせてください。

## 記法についての注意

KLE の Raw data は**厳密な JSON ではありません**。キーが引用符で囲まれておらず、
JSON5 に近い記法です。

```
[{a:7},"Esc","1\n!","2\n@"],
[{w:1.5},"Tab","Q","W"]
```

- **入力**: JSON5 相当のパーサを使います。`JSON.parse` では読めません。
  正規表現でキーに引用符を足すような前処理は破綻するので行わないこと
  (文字列リテラル内のコロンや波括弧を壊します)。
  `json5` パッケージの使用を認めます (依存を増やす例外。理由はこの節)。
- **入力の外側**: Raw data は行の配列だけを並べた「外側の `[` `]` が無い」状態で
  貼られることがあります。パース前に、文字列が `[` で始まらない場合は
  `[` と `]` で包んでから読みます。
- **出力**: 妥当な JSON として書き出します (KLE は妥当な JSON も読めます)。
  1 行 = 1 キー行になるよう整形し、差分が読みやすい形にします。

## 全体構造

```jsonc
[
  { "name": "My Keyboard", "author": "...", "switchMount": "cherry" },  // 省略可: メタ情報
  ["Esc", "1", "2"],                                                    // 1 行目
  [{ "y": 0.25 }, "Tab", "Q"]                                           // 2 行目
]
```

- 先頭要素が**オブジェクト**ならメタ情報。配列なら 1 行目のキー行。
- 各行は `string` (キー) と `object` (以降のキーに適用するプロパティ) が混在した配列。
- オブジェクトは「次に現れるキー以降に効く**状態変更**」であり、キーそのものではありません。

## メタ情報

kle-serial の `KeyboardMetadata` に対応します。

| プロパティ | 内容 | 本アプリでの扱い |
|---|---|---|
| `name` | キーボード名 | `meta.keyboardName` および `project.name` |
| `author` | 作者 | `meta.maintainer` |
| `notes` | メモ | 警告を出して破棄 (モデルに保持先が無い) |
| `background` | 背景画像 `{ name, style }` | 破棄 |
| `backcolor` | 背景色 | 破棄 |
| `radii` | 角丸指定 | 破棄 |
| `switchMount` / `switchBrand` / `switchType` | スイッチ情報 | 破棄 (将来 KiCad のフットプリント選択に使える余地あり) |

出力時は `name` と `author` のみ書き出します。

## 逐次状態機械

KLE の raw data は**状態機械**として読みます。オブジェクトが状態を変え、
文字列が現在の状態でキーを 1 つ確定させます。

### 状態

```ts
interface KleCursor {
  x: number;          // 次のキーの左上 X (U)
  y: number;          // 次のキーの左上 Y (U)
  width: number;      // 幅 (既定 1)
  height: number;     // 高さ (既定 1)
  x2: number; y2: number; width2: number; height2: number;  // 副矩形
  rotationAngle: number;
  rotationX: number; rotationY: number;
  color: string;                       // キーキャップ色
  textColor: (string | undefined)[];   // スロットごとの刻印色
  textSize: (number | undefined)[];    // スロットごとの文字サイズ
  align: number;                       // a の値 (既定 4)
  profile: string;
  nub: boolean; stepped: boolean; decal: boolean; ghost: boolean;
  sm: string; sb: string; st: string;
}
```

### プロパティの意味

| プロパティ | 効果 | キー確定後 |
|---|---|---|
| `x` | `cursor.x` に**加算** (絶対指定ではない) | – |
| `y` | `cursor.y` に**加算** | – |
| `w` | 幅を設定。`width2` も同じ値に設定 | 1 に戻る |
| `h` | 高さを設定。`height2` も同じ値に設定 | 1 に戻る |
| `x2` `y2` | 副矩形の相対位置 | 0 に戻る |
| `w2` `h2` | 副矩形の寸法 | 0 に戻る |
| `r` | 回転角 (度) | 継続 |
| `rx` | 回転原点 X。設定時に `cursor.x` / `cursor.y` を回転原点にリセット | 継続 |
| `ry` | 回転原点 Y。同上 | 継続 |
| `a` | 刻印の配置コード (0〜7、既定 4) | 継続 |
| `f` | 既定の文字サイズ。`textSize` 配列をリセット | 継続 |
| `f2` | スロット 1〜11 の文字サイズ | 継続 |
| `fa` | `textSize` 配列を丸ごと置き換え | 継続 |
| `p` | キーキャップのプロファイル (`DCS` 等) | 継続 |
| `c` | キーキャップ色 (`#rrggbb`) | 継続 |
| `t` | 刻印色。改行区切りでスロットごとに指定。先頭が既定色 | 継続 |
| `n` | ホーミング (nub) | `false` に戻る |
| `l` | ステップド | `false` に戻る |
| `d` | デカール (スイッチなし) | `false` に戻る |
| `g` | ゴースト | 継続 |
| `sm` `sb` `st` | スイッチのマウント / ブランド / タイプ | 継続 |

**重要な規則**

1. `w` / `h` / `x2` / `y2` / `w2` / `h2` / `n` / `l` / `d` は**キーを 1 つ確定するたびに
   既定値へ戻ります**。色・文字サイズ・回転・配置コードは戻りません。
2. キー確定後、`cursor.x += cursor.width`。
3. 行の終わりで `cursor.y += 1` し、`cursor.x = cursor.rotationX`
   (回転原点が設定されていればそこへ、既定は 0)。
4. `r` / `rx` / `ry` は**行の先頭のキーにしか指定できません**。
   途中に現れた場合はエラーにします (参照実装も例外を投げます)。

### 刻印の並び替え

キーの文字列は改行区切りで最大 12 個の刻印を含みます。
`a` (配置コード) によって、**何番目の要素がどのスロットに入るか**が変わります。

kle-serial の `labelMap` (そのまま引き写したもの):

```ts
const labelMap: number[][] = [
  // 入力配列の index 0..11 → スロット番号
  [0, 6, 2, 8, 9, 11, 3, 5, 1, 4, 7, 10], // a=0: 中央寄せなし
  [1, 7, -1, -1, 9, 11, 4, -1, -1, -1, -1, 10], // a=1: 横中央
  [3, -1, 5, -1, 9, 11, -1, -1, 4, -1, -1, 10], // a=2: 縦中央
  [4, -1, -1, -1, 9, 11, -1, -1, -1, -1, -1, 10], // a=3: 横+縦中央
  [0, 6, 2, 8, 10, -1, 3, 5, 1, 4, 7, -1], // a=4: 前面中央 (既定)
  [1, 7, -1, -1, 10, -1, 4, -1, -1, -1, -1, -1], // a=5: 前面中央+横
  [3, -1, 5, -1, 10, -1, -1, -1, 4, -1, -1, -1], // a=6: 前面中央+縦
  [4, -1, -1, -1, 10, -1, -1, -1, -1, -1, -1, -1], // a=7: 前面中央+横+縦
];

function reorderLabelsIn(labels: (string | undefined)[], align: number) {
  const ret: (string | undefined)[] = [];
  for (let i = 0; i < labels.length; ++i) {
    if (labels[i]) ret[labelMap[align][i]] = labels[i];
  }
  return ret;
}
```

`-1` は「そのスロットは使われない」を意味します。`t` (刻印色) と
`fa` (文字サイズ) も同じ並び替えを通します。

スロット番号とモデルの `LegendSlot` の対応:

| スロット番号 | `LegendSlot` | 位置 |
|---|---|---|
| 0 | `topLeft` | 左上 |
| 1 | `topCenter` | 上中央 |
| 2 | `topRight` | 右上 |
| 3 | `centerLeft` | 左中段 |
| 4 | `center` | 中央 |
| 5 | `centerRight` | 右中段 |
| 6 | `bottomLeft` | 左下 |
| 7 | `bottomCenter` | 下中央 |
| 8 | `bottomRight` | 右下 |
| 9 | `frontLeft` | 前面左 |
| 10 | `frontCenter` | 前面中央 |
| 11 | `frontRight` | 前面右 |

## モデルへの対応

| KLE | `KeyModel` |
|---|---|
| `cursor.x` / `cursor.y` | `position` |
| `width` / `height` | `size` |
| `rotationAngle` | `rotation.angle` |
| `rotationX` / `rotationY` | `rotation.origin` (絶対座標。両方 0 かつ角度 0 なら `null`) |
| `x2` / `y2` / `width2` / `height2` | `secondary` (`width2 !== width` などの差がある場合のみ) |
| `stepped` | `shape = 'steppedCaps'` |
| 副矩形が下側にずれた 1.5U×2U | `shape = 'isoEnter'` |
| 副矩形が左下の大きい形 | `shape = 'bigAssEnter'` |
| 上記に当てはまらない副矩形 | `shape = 'custom'` + `polygon` |
| `decal` / `nub` / `ghost` | `decal` / `homing` / `ghost` |
| `color` | `color` |
| `textColor[]` の先頭 | `legendColor` (スロットごとの色はモデルに持たないため警告) |
| 並び替え後の刻印 | `legends` |
| (該当なし) | `matrix` は常に `null` |
| `profile` / `sm` / `sb` / `st` / `textSize` | 破棄 (警告) |

### 形状の判定

副矩形から `shape` を推定します。判定は許容誤差 `EPSILON_U` 付きで行います。

```
ISO Enter:       w=1.25 h=2, x2=-0.25 y2=0 w2=1.5 h2=1   (KLE の慣例)
Big-Ass Enter:   w=1.5  h=2, x2=-0.75 y2=1 w2=2.25 h2=1
Stepped:         l=true (副矩形ではなくフラグで判定)
```

推定できない副矩形は `custom` にして `polygon` に輪郭を入れ、
「独自形状として読み込みました」と警告します。**副矩形を捨てないこと。**

## 出力

モデルから raw JSON を作るときは、**状態変更を最小限にする**のが原則です。

1. キーを Y → X の順に並べ、Y が変わるところで行を分ける。
2. 行の先頭で、期待される `cursor.y` との差があれば `{"y": 差分}` を出す。
3. 行内で、期待される `cursor.x` との差があれば `{"x": 差分}` を出す。
4. `w` / `h` は 1 以外のときだけ出す。
5. 副矩形は `x2` `y2` `w2` `h2` を出す。
6. 回転クラスタ (同じ `rotation` を持つキー群) は、**回転ごとに行を分け**、
   行の先頭で `{"r": 角度, "rx": X, "ry": Y}` を出す
   (`r`/`rx`/`ry` が行頭にしか置けないため)。
7. 色・刻印色は直前のキーと変わったときだけ出す。
8. 刻印は `a: 0` (中央寄せなし) で出力する。12 スロットをそのまま並べられ、
   並び替えの推測が不要になるため。使われていない末尾のスロットは省く。

### 出力例

```json
[
  {"name":"Example"},
  [{"a":0},"Esc","1\n!","2\n@"],
  [{"y":0.25,"w":1.5},"Tab","Q","W"],
  [{"r":15,"rx":6,"ry":4,"y":-1,"x":-0.5},"Fn"]
]
```

## テスト用フィクスチャ

`tests/fixtures/kle/` に以下を置き、ラウンドトリップと出力の一致を検証します。

| フィクスチャ | 検証内容 |
|---|---|
| `ansi-104` | 一般的な全キーボード。基本の座標・寸法 |
| `iso-105` | ISO Enter の副矩形、縦 2U |
| `tkl-60` | 60% 配列。行ごとの `x` 継承 |
| `ergo-split` | 回転クラスタ (`r`/`rx`/`ry`) を含む分割配列 |
| `stepped-caps` | `l:true` のステップド |
| `decal-legends` | `d:true` と 12 スロットすべての刻印、`a` の値が 0/4/7 混在 |
| `colors` | `c` / `t` の継承と切り替え |
| `numpad-vertical` | 縦 2U キー (`h:2`) |

各フィクスチャで検証すること:

1. `parse(input) → project` がスナップショットと一致
2. `serialize(project) → text` を再度 `parse` した結果が 1 と同値 (ラウンドトリップ)
3. 警告の一覧がスナップショットと一致 (落ちる情報を把握するため)
