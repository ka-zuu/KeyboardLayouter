/**
 * `RenderScene`: 描画に必要な情報だけを持つ平坦な構造。
 * ストアの型をそのまま渡さず、ここで射影することでコンポーネントを
 * ストアの形から独立させる (docs/adr/0002-rendering.md)。
 *
 * ここでビューポートカリングと LOD (詳細度) 判定も行う:
 * - 表示範囲外のキーは含めない (`visibleAABB` に余白を足した範囲で判定)
 * - `scale < 0.4` では刻印と 1U グリッド線を省く
 *   (docs/adr/0002-rendering.md#結果 の対策、docs/UI_SPEC.md#表示)
 */
import { rotationCenterOf } from '@/core/geometry/rect';
import { aabbOfKey, outlineOf, type AABB } from '@/core/geometry/shape';
import { uToPx } from '@/core/geometry/units';
import { visibleAABB, type ViewportSizePx } from '@/core/geometry/viewport';
import type { KeyModel, PointU, ProjectModel } from '@/core/model/types';
import { outlineToSvgPath } from './svgPath';

/** 1U グリッド線・刻印を出すかどうかの閾値 (docs/UI_SPEC.md#表示)。 */
export const LOD_SCALE_THRESHOLD = 0.4;

/** カリングの余白 (U)。ビューポート境界ぎりぎりのキーが急に消えないように。 */
const CULL_MARGIN_U = 2;

export interface RenderKey {
  key: KeyModel;
  /** SVG path の d 属性 (レイアウト単位 U のまま。回転前・キー左上原点)。 */
  path: string;
  /** 回転中心。キー左上からの相対座標 (U)。 */
  localCenter: PointU;
}

export interface RenderScene {
  keys: RenderKey[];
  selectedKeyIds: ReadonlySet<string>;
  /** 現在ビューポートに映っているレイアウト座標の範囲。グリッド描画に使う。 */
  visible: AABB;
  scale: number;
  panPx: PointU;
  /** `uToPx(1, scale)`。SVG のスケール transform に使う。 */
  pxPerU: number;
  showLegends: boolean;
  showMinorGrid: boolean;
  showMatrix: boolean;
}

export interface SceneEditorInput {
  scale: number;
  panPx: PointU;
  selectedKeyIds: readonly string[];
  showMatrix: boolean;
}

function isOutsideCullBox(box: AABB, cull: AABB): boolean {
  return box.maxX < cull.minX || box.minX > cull.maxX || box.maxY < cull.minY || box.minY > cull.maxY;
}

export function buildScene(project: ProjectModel, editor: SceneEditorInput, viewportPx: ViewportSizePx): RenderScene {
  const visible = visibleAABB({ scale: editor.scale, panPx: editor.panPx }, viewportPx);
  const cullBox: AABB = {
    minX: visible.minX - CULL_MARGIN_U,
    maxX: visible.maxX + CULL_MARGIN_U,
    minY: visible.minY - CULL_MARGIN_U,
    maxY: visible.maxY + CULL_MARGIN_U,
  };

  const showLegends = editor.scale >= LOD_SCALE_THRESHOLD;
  const showMinorGrid = editor.scale >= LOD_SCALE_THRESHOLD;

  const keys: RenderKey[] = [];
  for (const key of project.keys) {
    if (isOutsideCullBox(aabbOfKey(key), cullBox)) continue;

    const center = rotationCenterOf(key);
    keys.push({
      key,
      path: outlineToSvgPath(outlineOf(key)),
      localCenter: { x: center.x - key.position.x, y: center.y - key.position.y },
    });
  }

  return {
    keys,
    selectedKeyIds: new Set(editor.selectedKeyIds),
    visible,
    scale: editor.scale,
    panPx: editor.panPx,
    pxPerU: uToPx(1, editor.scale),
    showLegends,
    showMinorGrid,
    showMatrix: editor.showMatrix,
  };
}
