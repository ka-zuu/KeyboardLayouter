import { describe, expect, it } from 'vitest';
import { createKey } from '@/core/model/key';
import { findPreset, KEY_PRESETS, MAX_PRESET_COUNT, presetPartials } from '@/core/model/presets';

function preset(id: string) {
  const p = findPreset(id);
  if (!p) throw new Error(`preset ${id} が無い`);
  return p;
}

describe('KEY_PRESETS', () => {
  it('docs/UI_SPEC.md#キー追加-プリセット の 13 種を持ち、id が重複しない', () => {
    expect(KEY_PRESETS).toHaveLength(13);
    expect(new Set(KEY_PRESETS.map((p) => p.id)).size).toBe(13);
  });

  it('ISO Enter / Big-Ass Enter は KLE 慣例の主矩形 + 副矩形を持つ (docs/formats/KLE.md)', () => {
    expect(preset('iso-enter').partial).toMatchObject({ shape: 'isoEnter', size: { w: 1.25, h: 2 }, secondary: { x: -0.25, y: 0, w: 1.5, h: 1 } });
    expect(preset('big-ass-enter').partial).toMatchObject({ shape: 'bigAssEnter', size: { w: 1.5, h: 2 }, secondary: { x: -0.75, y: 1, w: 2.25, h: 1 } });
  });

  it('ステップドは steppedCaps の標準副矩形を持つ', () => {
    expect(preset('stepped-1.75u').partial).toMatchObject({ shape: 'steppedCaps', size: { w: 1.75, h: 1 }, secondary: { x: 0, y: 0, w: 1.3125, h: 1 } });
  });

  it('縦 2U は 1×2', () => {
    expect(preset('vertical-2u').partial.size).toEqual({ w: 1, h: 2 });
  });
});

describe('presetPartials', () => {
  it('count 個を X 方向に隣接配置する', () => {
    const partials = presetPartials(preset('1.5u'), 3, { x: 1, y: 2 });
    expect(partials.map((p) => p.position)).toEqual([
      { x: 1, y: 2 },
      { x: 2.5, y: 2 },
      { x: 4, y: 2 },
    ]);
  });

  it('count を 1〜MAX_PRESET_COUNT に丸める', () => {
    expect(presetPartials(preset('1u'), 0, { x: 0, y: 0 })).toHaveLength(1);
    expect(presetPartials(preset('1u'), 2.7, { x: 0, y: 0 })).toHaveLength(2);
    expect(presetPartials(preset('1u'), 10000, { x: 0, y: 0 })).toHaveLength(MAX_PRESET_COUNT);
  });

  it('各 partial は独立したオブジェクトで、プリセット定義を共有しない', () => {
    const [a, b] = presetPartials(preset('iso-enter'), 2, { x: 0, y: 0 });
    expect(a!.secondary).not.toBe(b!.secondary);
    expect(a!.secondary).not.toBe(preset('iso-enter').partial.secondary);
  });

  it('rect プリセットから作ったキーは createKey の既定値 (shape: rect, secondary: null) を保つ', () => {
    const [partial] = presetPartials(preset('2u'), 1, { x: 0, y: 0 });
    const key = createKey(partial, { newId: () => 'k', now: () => 0 });
    expect(key).toMatchObject({ shape: 'rect', secondary: null, size: { w: 2, h: 1 }, position: { x: 0, y: 0 } });
  });
});
