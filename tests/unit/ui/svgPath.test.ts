import { describe, expect, it } from 'vitest';
import { outlineOf } from '@/core/geometry/shape';
import { outlineToSvgPath } from '@/ui/canvas/svgPath';

describe('outlineToSvgPath', () => {
  it('矩形キーは 4 点の M/L/Z になる', () => {
    const outline = outlineOf({ shape: 'rect', size: { w: 1, h: 1 }, secondary: null, polygon: null });
    const d = outlineToSvgPath(outline);
    expect(d).toBe('M 0 0 L 1 0 L 1 1 L 0 1 Z');
  });

  it('ISO Enter は幾何和の輪郭になる (6 点)', () => {
    // 主矩形は (0,0,1.5,1)。副矩形 (0.25,1,1.25,1) は主矩形の真下に続く
    // (docs/GEOMETRY.md#キー形状の輪郭)。
    const outline = outlineOf({
      shape: 'isoEnter',
      size: { w: 1.5, h: 1 },
      secondary: { x: 0.25, y: 1, w: 1.25, h: 1 },
      polygon: null,
    });
    const d = outlineToSvgPath(outline);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    // 6 頂点 = M + 5 個の L (split(' L ') は区切り 5 個で要素数 6 になる)
    expect(d.split(' L ')).toHaveLength(6);
  });

  it('ステップドは主矩形と同じ 4 頂点になる (副矩形は描画用の刻み情報)', () => {
    const outline = outlineOf({
      shape: 'steppedCaps',
      size: { w: 1.75, h: 1 },
      secondary: { x: 0, y: 0, w: 1.3125, h: 1 },
      polygon: null,
    });
    const d = outlineToSvgPath(outline);
    expect(d).toBe('M 0 0 L 1.75 0 L 1.75 1 L 0 1 Z');
  });

  it('Big-Ass Enter は左下に副矩形を持つ幾何和になる', () => {
    const outline = outlineOf({
      shape: 'bigAssEnter',
      size: { w: 1.5, h: 2 },
      secondary: { x: 0, y: 1, w: 1.5, h: 1 },
      polygon: null,
    });
    const d = outlineToSvgPath(outline);
    // 副矩形が主矩形の下半分いっぱいを覆うため、実質 4 頂点の矩形と同じ形になる
    expect(d).toBe('M 0 0 L 1.5 0 L 1.5 2 L 0 2 Z');
  });

  it('custom (polygon) はそのまま出力する', () => {
    const outline = outlineOf({
      shape: 'custom',
      size: { w: 1, h: 1 },
      secondary: null,
      polygon: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0.5, y: 1 },
      ],
    });
    const d = outlineToSvgPath(outline);
    expect(d).toBe('M 0 0 L 1 0 L 0.5 1 Z');
  });

  it('点が無ければ空文字を返す', () => {
    expect(outlineToSvgPath([])).toBe('');
  });
});
