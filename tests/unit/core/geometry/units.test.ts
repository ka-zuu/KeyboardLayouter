import { describe, expect, it } from 'vitest';
import { layoutToScreen, mmToU, screenToLayout, uToMm, uToPx, pxToU } from '@/core/geometry/units';

describe('単位換算の往復', () => {
  it.each([0, 1, 1.5, 19.05, 100])('mmToU(uToMm(%f)) === x', (x) => {
    expect(mmToU(uToMm(x))).toBeCloseTo(x, 10);
  });

  it.each([0, 1, 0.2, 4])('pxToU(uToPx(x, scale)) === x', (x) => {
    const scale = 1.5;
    expect(pxToU(uToPx(x, scale), scale)).toBeCloseTo(x, 10);
  });

  it('screenToLayout と layoutToScreen が往復する', () => {
    const scale = 2;
    const pan = { x: 10, y: -5 };
    const pointU = { x: 3, y: 4 };
    const screen = layoutToScreen(pointU, scale, pan);
    const back = screenToLayout(screen, scale, pan);
    expect(back.x).toBeCloseTo(pointU.x, 10);
    expect(back.y).toBeCloseTo(pointU.y, 10);
  });
});
