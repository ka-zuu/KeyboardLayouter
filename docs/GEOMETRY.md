# 座標系とジオメトリ

単位の取り違えが最も多いバグ源なので、変数名に単位を付け (`xU` / `xMm` / `xPx`)、
換算は必ず `core/geometry/units.ts` の関数を通します。

## 3 つの座標系

| 名前 | 単位 | 用途 | 原点 / 向き |
|---|---|---|---|
| レイアウト座標 | U | モデルが持つ値。すべての計算の基準 | 任意 (負値可)。X 右が正、Y **下**が正 |
| 物理座標 | mm | KiCad 出力 | レイアウト座標を 19.05 倍したもの |
| 画面座標 | px | 描画・ポインタ入力 | キャンバス左上。`scale` と `panPx` で変換 |

```ts
/** 1U の物理寸法 (mm)。Cherry MX の標準ピッチ。 */
export const MM_PER_U = 19.05;

/** 画面上での 1U の基準ピクセル数 (scale = 1 のとき)。 */
export const PX_PER_U = 60;

export const uToMm = (u: number): number => u * MM_PER_U;
export const mmToU = (mm: number): number => mm / MM_PER_U;

export const uToPx = (u: number, scale: number): number => u * PX_PER_U * scale;
export const pxToU = (px: number, scale: number): number => px / (PX_PER_U * scale);

/** 画面座標 → レイアウト座標 */
export function screenToLayout(
  pointPx: { x: number; y: number },
  scale: number,
  panPx: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: (pointPx.x - panPx.x) / (PX_PER_U * scale),
    y: (pointPx.y - panPx.y) / (PX_PER_U * scale),
  };
}

/** レイアウト座標 → 画面座標 */
export function layoutToScreen(
  pointU: { x: number; y: number },
  scale: number,
  panPx: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: pointU.x * PX_PER_U * scale + panPx.x,
    y: pointU.y * PX_PER_U * scale + panPx.y,
  };
}
```

`MM_PER_U` と `PX_PER_U` の値は旧アプリ (`lib/constants.ts`) と同じです。

## 座標の範囲

**負座標を許します。** 旧アプリはキー追加・移動のたびに `Math.max(0, x)` で
0 にクランプしていましたが、これは以下の問題を起こします。

- KLE のレイアウト (特に回転クラスタを含むもの) は負座標を含むことがあり、
  インポート時に形が崩れる
- 複数キーを選択して左上方向へ動かすと、一部のキーだけが 0 で止まり
  相対位置が壊れる

代わりに、

- 保存時・出力時に**正規化**する。全キーの AABB の左上を求め、それが原点になるよう
  平行移動した座標を出力する (`normalizeOrigin(project)`)。
- 画面上では原点に十字の目印を描き、ユーザーが基準を見失わないようにする。

## ズームとパン

- `scale` の範囲は 0.2〜4.0 (旧アプリは 0.5〜3.0)。
- ホイールズームは**カーソル位置を固定点**にする。
  ```
  newPan = cursorPx - (cursorPx - oldPan) * (newScale / oldScale)
  ```
- パン操作: Space + ドラッグ / 中ボタンドラッグ / 2 本指ドラッグ。
- 「全体を表示」(`Shift+1`) は全キーの AABB に余白 1U を足して収まる `scale` を求める。

## グリッドとスナップ

| 選択肢 | 用途 |
|---|---|
| 1U | 標準的な格子配置 |
| 0.5U | 1.5U キーの半端合わせ |
| 0.25U (既定) | 一般的なずらし配置 |
| 0.125U | 微調整 |
| 0.05U | 実質的な自由配置 |

```ts
export function snapU(valueU: number, gridSize: number, enabled: boolean): number {
  if (!enabled) return valueU;
  return Math.round(valueU / gridSize) * gridSize;
}
```

- スナップは**位置・サイズ・移動量**に適用する。回転角には適用しない
  (回転は `Shift` 押下時のみ 15° 刻みにする)。
- 浮動小数の誤差が蓄積するのを避けるため、スナップ結果は
  小数第 4 位で丸める (`Math.round(v * 10000) / 10000`)。

## 回転

回転は 3 つの文脈で意味が変わります。ここを混同すると出力が壊れます。

| 文脈 | 回転中心 | 角度の向き |
|---|---|---|
| 画面表示 | `rotation.origin ?? キーの幾何中心` | 時計回りが正 (度) |
| QMK (`r`, `rx`, `ry`) | `rx`, `ry` は**絶対座標** (U) | 時計回りが正 (度) |
| KiCad (`(at x y angle)`) | フットプリント/シンボルの挿入点 | **反時計回りが正** (度) |

- モデルの `rotation.origin` は**絶対座標**です (旧アプリの `rotationCenter` は
  「キー左上からの相対オフセット」でしたが、常に `{0,0}` 固定で編集 UI もなく、
  キャンバスは幾何中心回転、QMK 出力は原点回転という不整合がありました)。
- `origin === null` は「幾何中心を軸に回す」を意味します。UI からキーを単体で
  回したときはこちらになります。
- KLE から読み込んだ `rx`/`ry` はそのまま `origin` に入ります。
- KiCad 出力時は角度の符号を反転させます (`-angle`)。

```ts
export function rotationCenterOf(key: KeyModel): PointU {
  if (key.rotation.origin !== null) return key.rotation.origin;
  return {
    x: key.position.x + key.size.w / 2,
    y: key.position.y + key.size.h / 2,
  };
}
```

### 複数選択の一括回転 (オービット)

複数キーを選択して回転ハンドルを回すと、選択範囲全体の中心を軸に
すべてのキーが公転します。各キーについて:

1. `position` を軸周りに回転させる
2. `rotation.angle` に同じ角度を加算する
3. `rotation.origin` が非 null ならそれも軸周りに回転させる

## 回転矩形の計算

以下は旧アプリの `lib/geometry.ts` から移植します
(sin/cos を呼び出し側で事前計算して渡せる形になっており、多数のキーを扱う
ループでの三角関数呼び出しを削減できます)。

```ts
export function rotatePointPrecalc(
  point: PointU, center: PointU, sin: number, cos: number,
): PointU;

/** 回転後の 4 頂点。angle === 0 のときは早期に非回転の頂点を返す。 */
export function getRotatedRectPoints(
  x: number, y: number, w: number, h: number, angleDeg: number,
  cx?: number, cy?: number, precalc?: { sin: number; cos: number },
): PointU[];

/** 4 頂点を作らずに AABB を求める (各項の極値から算出)。 */
export function getRotatedRectAABB(
  x: number, y: number, w: number, h: number, angleDeg: number,
  cx?: number, cy?: number, precalc?: { sin: number; cos: number },
): { minX: number; maxX: number; minY: number; maxY: number };
```

副矩形を持つキー (ISO Enter 等) の輪郭は、主矩形と副矩形の和として
多角形化してから回転させます (`core/geometry/shape.ts` の `outlineOf(key)`)。

### キー形状の輪郭

ISO Enter の輪郭は、主矩形 1.5U×1U と副矩形 1.25U×1U (右寄せ) の和として
次の 6 点で表します (キー左上を原点、単位 U)。

```
(0,0) → (1.5,0) → (1.5,2) → (0.25,2) → (0.25,1) → (0,1) → 閉じる
```

旧アプリの `ISO_ENTER_PATH` と同じ形です。ステップド・Big-Ass Enter も
同様に「主矩形 + 副矩形」から輪郭を生成します
(旧アプリの `stepped_caps` は矩形として描画されるだけの未実装状態でした)。

## 選択判定

矩形選択 (ラバーバンド) の判定は 3 段構えにします。旧アプリと同じ方針です。

1. **AABB 判定** — 回転していないキー (`angle === 0`) はこれだけで確定。
2. **包含円判定** — 回転しているキーは、まず回転中心から最遠頂点までの距離を
   半径とする円と選択範囲が交差するかを見る。交差しなければ除外。
3. **SAT (分離軸判定)** — 円判定を通ったものだけ、多角形同士の正確な交差を判定する。

```ts
/** 2 つの凸多角形が交差するか (分離軸判定)。 */
export function doPolygonsIntersect(a: PointU[], b: PointU[]): boolean;
```

判定モードは 2 つ用意します。

| モード | 条件 | 操作 |
|---|---|---|
| 交差選択 (既定) | 選択範囲とキーが少しでも重なる | ドラッグ |
| 包含選択 | キー全体が選択範囲に入る | `Alt` + ドラッグ |

## 許容誤差

```ts
/** 座標の同一視に使う許容誤差 (U)。0.05U グリッドより十分小さい値。 */
export const EPSILON_U = 1e-4;

/** 同じ行と見なす Y 座標の差 (U)。マトリクス自動割り当てで使う。 */
export const ROW_TOLERANCE_U = 0.1;
```

座標の比較に `===` を使わないこと。`ROW_TOLERANCE_U` の使い方は
[MATRIX.md](MATRIX.md) を参照してください。
