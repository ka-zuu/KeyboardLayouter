import { describe, expect, it } from 'vitest';
import { LEGEND_SLOT_ORDER, primaryLegendSlotOf, withLegend } from '@/core/model/key';

describe('primaryLegendSlotOf', () => {
  it('上段 → 前面、左 → 右の順で最初に値があるスロット', () => {
    expect(primaryLegendSlotOf({ legends: { bottomLeft: '1', topRight: 'Q' } })).toBe('topRight');
    expect(primaryLegendSlotOf({ legends: { frontCenter: 'Fn' } })).toBe('frontCenter');
  });

  it('刻印が無ければ center', () => {
    expect(primaryLegendSlotOf({ legends: {} })).toBe('center');
  });

  it('12 スロットすべてを 1 回ずつ含む', () => {
    expect(new Set(LEGEND_SLOT_ORDER).size).toBe(12);
  });
});

describe('withLegend', () => {
  it('空文字はスロットごと消し、元のオブジェクトは変えない', () => {
    const legends = { center: 'A', topLeft: 'B' };
    expect(withLegend(legends, 'center', '')).toEqual({ topLeft: 'B' });
    expect(withLegend(legends, 'center', 'C')).toEqual({ center: 'C', topLeft: 'B' });
    expect(legends).toEqual({ center: 'A', topLeft: 'B' });
  });
});
