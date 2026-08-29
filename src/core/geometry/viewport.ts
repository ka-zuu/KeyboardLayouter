/**
 * ビューポート (ズーム・パン・全体表示) の計算。docs/GEOMETRY.md#ズームとパンと 1 対 1。
 */
import type { PointU } from '@/core/model/types';
import { PX_PER_U } from './units';
import type { AABB } from './shape';

/** ズーム倍率の範囲。docs/GEOMETRY.md#ズームとパン (旧アプリの 0.5〜3.0 から拡大)。 */
export const MIN_SCALE = 0.2;
export const MAX_SCALE = 4.0;

/** scale を許容範囲に収める。 */
export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export interface ViewportSizePx {
  width: number;
  height: number;
}

export interface Viewport {
  scale: number;
  panPx: PointU;
}

/**
 * カーソル位置 (画面ピクセル) を固定点にズームする。
 * docs/GEOMETRY.md#ズームとパン の `newPan = cursorPx - (cursorPx - oldPan) * (newScale / oldScale)`。
 */
export function zoomAt(current: Viewport, cursorPx: PointU, nextScale: number): Viewport {
  const scale = clampScale(nextScale);
  if (scale === current.scale) return current;
  const ratio = scale / current.scale;
  return {
    scale,
    panPx: {
      x: cursorPx.x - (cursorPx.x - current.panPx.x) * ratio,
      y: cursorPx.y - (cursorPx.y - current.panPx.y) * ratio,
    },
  };
}

/** ホイールのデルタ量から次の scale を求める。既定のズーム係数は 1 デルタ単位あたり指数的に変化する。 */
export function scaleFromWheelDelta(scale: number, deltaY: number): number {
  const factor = Math.exp(-deltaY * 0.001);
  return clampScale(scale * factor);
}

/**
 * 「全体を表示」(`Shift+1`) 用の scale / panPx を求める。
 * 全キーの AABB に余白 paddingU を足して収まる scale を求め、中央に配置する。
 * キーが 0 件 (aabb === null) のときは原点を中心に scale=1 を返す。
 */
export function fitToAABB(aabb: AABB | null, viewportPx: ViewportSizePx, paddingU = 1): Viewport {
  if (aabb === null) {
    return {
      scale: 1,
      panPx: { x: viewportPx.width / 2, y: viewportPx.height / 2 },
    };
  }

  const minX = aabb.minX - paddingU;
  const maxX = aabb.maxX + paddingU;
  const minY = aabb.minY - paddingU;
  const maxY = aabb.maxY + paddingU;
  const widthU = Math.max(maxX - minX, EPSILON_SPAN);
  const heightU = Math.max(maxY - minY, EPSILON_SPAN);

  const scale = clampScale(Math.min(viewportPx.width / (widthU * PX_PER_U), viewportPx.height / (heightU * PX_PER_U)));

  const centerU = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  return {
    scale,
    panPx: {
      x: viewportPx.width / 2 - centerU.x * PX_PER_U * scale,
      y: viewportPx.height / 2 - centerU.y * PX_PER_U * scale,
    },
  };
}

/** widthU / heightU が 0 になる (キー1個やAABBが退化した) 場合のフォールバック幅 (U)。 */
const EPSILON_SPAN = 1e-3;

/** 現在のビューポートに映っているレイアウト座標の範囲 (ビューポートカリング用)。 */
export function visibleAABB(viewport: Viewport, viewportPx: ViewportSizePx): AABB {
  const { scale, panPx } = viewport;
  const minX = -panPx.x / (PX_PER_U * scale);
  const minY = -panPx.y / (PX_PER_U * scale);
  const maxX = (viewportPx.width - panPx.x) / (PX_PER_U * scale);
  const maxY = (viewportPx.height - panPx.y) / (PX_PER_U * scale);
  return { minX, maxX, minY, maxY };
}
