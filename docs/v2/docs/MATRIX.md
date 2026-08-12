# 電気マトリクス

物理的なキー配置と、ファームウェア・基板が扱う「行 (Row) と列 (Col)」の対応を扱います。
QMK の `info.json`、KiCad の回路図、VIA 定義はすべてこの情報に依存するため、
ここが間違っていると出力すべてが狂います。

## 用語

- **Row / Col**: マトリクス上の行番号・列番号 (0 始まり)。物理的な行・列と
  一致させる必要はなく、実際の配線に合わせた論理的な番号です。
- **ダイオード方向**: `COL2ROW` (列から行へ電流が流れる) / `ROW2COL`。
  QMK の `diode_direction` と、KiCad 回路図でのダイオードの向きに影響します。
- **ゴースト対策**: 各スイッチに直列ダイオードを入れることで、同時押し時の
  誤検出を防ぎます。本アプリの KiCad 出力は 1 スイッチ 1 ダイオードを前提とします。

## モデル上の表現

```ts
matrix: { row: number; col: number } | null
```

`null` は**未割り当て**を意味します。旧アプリは既定値 `{ row: 0, col: 0 }` を
持っていたため「未割り当て」と「0 行 0 列に割り当て済み」を区別できませんでした。

- `decal: true` のキー (装飾のみ、スイッチなし) には割り当てません。常に `null`。
- 出力時のチェック:
  | 形式 | `matrix === null` のキーがあるとき |
  |---|---|
  | KLE raw JSON | 問題なし (マトリクス情報を持たない形式) |
  | QMK `info.json` | 警告を出し、`matrix` フィールドを省いて出力 |
  | KiCad | **エラーにして出力を中止** (配線できないため) |
  | VIA / Vial | エラーにして出力を中止 |

## 自動割り当て (Auto-Assign)

物理配置から Row/Col を推定します。アルゴリズムは旧アプリの
`store/useStore.ts` の `autoAssignMatrix` を移植します。

### 手順

1. **対象を決める** — 選択中のキーがあればそれのみ、なければ全キー。
   `decal: true` のキーは常に除外する。
2. **並べ替える** — Y 座標を `ROW_TOLERANCE_U` (0.1U) 単位のバケットに量子化し、
   バケット番号が異なればバケット順、同じなら X 座標順に並べる。
3. **番号を振る** — 並んだ順に見ていき、直前のキーとの Y 差が
   `ROW_TOLERANCE_U` を超えたら「新しい行」として `row` を 1 進めて `col` を
   開始値に戻す。同じ行なら `col` を 1 進める。
4. **開始番号** — `startRow` / `startCol` を UI から指定できる (既定 0)。
   分割キーボードの右手側を `col` 7 から始めたい、といった用途のため。

```ts
export interface AutoAssignOptions {
  startRow: number;
  startCol: number;
  /** 同一行と見なす Y 差 (U)。既定 0.1。 */
  rowTolerance?: number;
}

export function autoAssignMatrix(
  project: ProjectModel,
  targetIds: readonly string[] | null,
  options: AutoAssignOptions,
): ProjectModel;
```

### 量子化を外してはいけない理由

「Y の差が許容誤差以内なら同じ行」という比較関数を素朴に書くと、
**推移律が成り立ちません**。

```
A.y = 0.00, B.y = 0.09, C.y = 0.18   (許容誤差 0.1)
A == B (差 0.09), B == C (差 0.09), しかし A != C (差 0.18)
```

推移律を満たさない比較関数を `Array.prototype.sort` に渡すと、結果は
実行環境の実装依存になり、同じ入力でも並び順が変わり得ます。
そのため**先にバケットへ量子化してから比較**します。

```ts
const bucketOf = (y: number) => Math.round(y / rowTolerance);

const compare = (a: KeyModel, b: KeyModel) => {
  const ba = bucketOf(a.position.y);
  const bb = bucketOf(b.position.y);
  if (ba !== bb) return a.position.y - b.position.y;
  return a.position.x - b.position.x;
};
```

旧アプリでこの点は一度修正済みです。リファクタリング時に「単純化」して
元に戻さないよう注意してください。

### 回転したキーの扱い

回転クラスタ (親指キー等) は `position` そのままでは行が乱れます。
自動割り当てでは、回転を考慮した**キーの中心座標**を基準に並べ替えます。

```ts
const centerOf = (k: KeyModel): PointU => {
  const c = { x: k.position.x + k.size.w / 2, y: k.position.y + k.size.h / 2 };
  if (k.rotation.angle === 0) return c;
  return rotatePoint(c, rotationCenterOf(k), k.rotation.angle);
};
```

それでも意図と合わないことがあるため、**自動割り当ての結果は必ず手で直せる**ように
します (右インスペクタの Row/Col 入力)。

## 手動での確認

- キャンバス上にマトリクス番号を重ねて表示するトグル (`Row,Col` を各キーの隅に描く)。
- **マトリクス検証** をコマンドパレットから実行できるようにする。
  | 検査 | 内容 |
  |---|---|
  | 重複 | 同じ `(row, col)` を持つキーが 2 つ以上ある |
  | 未割り当て | `matrix === null` のキーがある (decal を除く) |
  | 欠番 | Row または Col の番号に飛びがある (警告のみ) |
  | サイズ | 使用中の最大 Row / Col から推定したマトリクスサイズを表示 |

検証結果は右インスペクタとステータスバーに出し、該当キーを選択できるようにします。

## 分割キーボード

`meta.split === true` のとき、各キーは `side: 'left' | 'right'` を持ちます。

- 自動割り当ては左右で独立に実行します (左を `row` 0〜、右を `row` 0〜 とするか、
  右を続き番号にするかは `startRow` / `startCol` で選べます)。
- QMK 出力では左右を 1 つの `LAYOUT` にまとめます (QMK の分割キーボードは
  左右で連続したマトリクスとして扱うため)。
- KiCad 出力では左右を別シートに分けます
  ([formats/KICAD.md](formats/KICAD.md#分割キーボード) 参照)。

## ピン割り当て

行・列とマイコンのピン (`matrix_pins`) の対応は、本アプリでは**扱いません**。
QMK 側で設定する項目であり、レイアウトからは決定できないためです。
`info.json` には `matrix_pins` を出力せず、その旨をエクスポート時に案内します。
