/**
 * 左パネルのキー追加プリセット。docs/UI_SPEC.md#キー追加-プリセット と 1 対 1。
 *
 * ISO Enter / Big-Ass Enter の寸法は docs/formats/KLE.md#形状の判定 の KLE 慣例
 * (主矩形 + 副矩形) をそのまま使う。KLE と往復させたときに形が変わらないようにするため。
 * ステップドは `defaultSecondaryFor()` の標準副矩形を使う。
 */
import { round4 } from '@/core/geometry/snap';
import { defaultSecondaryFor } from './key';
import type { KeyModel, PointU } from './types';

export interface KeyPreset {
  id: string;
  label: string;
  /** 追加するキーの内容。position は含めない (配置側が決める)。 */
  partial: Partial<KeyModel>;
}

function rectPreset(id: string, label: string, w: number, h = 1): KeyPreset {
  return { id, label, partial: { size: { w, h } } };
}

export const KEY_PRESETS: readonly KeyPreset[] = [
  rectPreset('1u', '1U', 1),
  rectPreset('1.25u', '1.25U', 1.25),
  rectPreset('1.5u', '1.5U', 1.5),
  rectPreset('1.75u', '1.75U', 1.75),
  rectPreset('2u', '2U', 2),
  rectPreset('2.25u', '2.25U', 2.25),
  rectPreset('2.75u', '2.75U', 2.75),
  rectPreset('6.25u', '6.25U Space', 6.25),
  rectPreset('7u', '7U Space', 7),
  {
    id: 'iso-enter',
    label: 'ISO Enter',
    partial: {
      size: { w: 1.25, h: 2 },
      shape: 'isoEnter',
      secondary: { x: -0.25, y: 0, w: 1.5, h: 1 },
    },
  },
  {
    id: 'big-ass-enter',
    label: 'Big-Ass Enter',
    partial: {
      size: { w: 1.5, h: 2 },
      shape: 'bigAssEnter',
      secondary: { x: -0.75, y: 1, w: 2.25, h: 1 },
    },
  },
  {
    id: 'stepped-1.75u',
    label: 'ステップド 1.75U',
    partial: {
      size: { w: 1.75, h: 1 },
      shape: 'steppedCaps',
      secondary: defaultSecondaryFor('steppedCaps', { w: 1.75, h: 1 }),
    },
  },
  rectPreset('vertical-2u', '縦 2U', 1, 2),
];

export function findPreset(id: string): KeyPreset | undefined {
  return KEY_PRESETS.find((p) => p.id === id);
}

/** 一括追加の上限。誤入力で数千個追加されるのを防ぐ。 */
export const MAX_PRESET_COUNT = 100;

/**
 * プリセットを `count` 個、X 方向に隣接させて並べた partial の配列を返す
 * (docs/UI_SPEC.md#キー追加-プリセット の一括追加)。`origin` は 1 個目の左上。
 * count は 1〜MAX_PRESET_COUNT に丸める。
 */
export function presetPartials(preset: KeyPreset, count: number, origin: PointU): Partial<KeyModel>[] {
  const n = Math.min(MAX_PRESET_COUNT, Math.max(1, Math.floor(count)));
  const w = preset.partial.size?.w ?? 1;
  // createKey は partial を既定値の上に spread するため、undefined のキーを作ると既定値を潰してしまう。
  // 元の partial にあるフィールドだけを複製する。
  const { size, secondary } = preset.partial;
  return Array.from({ length: n }, (_, i) => ({
    ...preset.partial,
    ...(size && { size: { ...size } }),
    ...(secondary && { secondary: { ...secondary } }),
    position: { x: round4(origin.x + w * i), y: round4(origin.y) },
  }));
}
