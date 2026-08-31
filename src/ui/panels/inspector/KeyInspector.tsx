/**
 * 単一選択時のインスペクタ = キープロパティ。docs/UI_SPEC.md#単一選択-キープロパティ。
 */
import { rotationCenterOf } from '@/core/geometry/rect';
import { defaultSecondaryFor } from '@/core/model/key';
import type { KeyModel, KeyShape, LegendSlot } from '@/core/model/types';
import { useEditorStore, useProjectStore } from '@/state/appState';
import { duplicateAndSelect } from '@/state/actions';
import { ActionButton, CheckboxField, ColorField, DragNumberField, Section, SelectField } from './fields';

const LEGEND_ROWS: LegendSlot[][] = [
  ['topLeft', 'topCenter', 'topRight'],
  ['centerLeft', 'center', 'centerRight'],
  ['bottomLeft', 'bottomCenter', 'bottomRight'],
  ['frontLeft', 'frontCenter', 'frontRight'],
];

const SHAPE_OPTIONS: { value: KeyShape; label: string }[] = [
  { value: 'rect', label: '矩形' },
  { value: 'isoEnter', label: 'ISO Enter' },
  { value: 'steppedCaps', label: 'ステップド' },
  { value: 'bigAssEnter', label: 'Big-Ass Enter' },
  { value: 'custom', label: 'カスタム' },
];

const HAS_SECONDARY_UI: ReadonlySet<KeyShape> = new Set(['isoEnter', 'steppedCaps', 'bigAssEnter']);

interface KeyInspectorProps {
  keyId: string;
}

function KeyInspector({ keyId }: KeyInspectorProps) {
  const key = useProjectStore((s) => s.project.keys.find((k) => k.id === keyId));
  const updateKeyProps = useProjectStore((s) => s.updateKeyProps);
  const setMatrix = useProjectStore((s) => s.setMatrix);
  const deleteKeys = useProjectStore((s) => s.deleteKeys);
  const gridSize = useEditorStore((s) => s.gridSize);
  const clearSelection = useEditorStore((s) => s.clearSelection);

  if (!key) return null;

  const patch = (p: Partial<KeyModel>, coalesceKey: string | null = null): void => updateKeyProps([key.id], p, coalesceKey);

  const usesOrigin = key.rotation.origin !== null;
  const displayedCenter = rotationCenterOf(key);

  function onShapeChange(shape: KeyShape): void {
    if (!key) return;
    if (shape === 'rect') {
      patch({ shape, secondary: null, polygon: null });
    } else if (shape === 'custom') {
      const fallbackPolygon = key.polygon ?? [
        { x: 0, y: 0 },
        { x: key.size.w, y: 0 },
        { x: key.size.w, y: key.size.h },
        { x: 0, y: key.size.h },
      ];
      patch({ shape, secondary: null, polygon: fallbackPolygon });
    } else {
      patch({ shape, secondary: defaultSecondaryFor(shape, key.size), polygon: null });
    }
  }

  return (
    <div className="kl-inspector" data-testid="single-key-inspector">
      <Section title="刻印">
        <div className="kl-legend-grid" data-testid="legend-grid">
          {LEGEND_ROWS.flat().map((slot) => (
            <input
              key={slot}
              data-testid={`legend-${slot}`}
              value={key.legends[slot] ?? ''}
              onChange={(e) => {
                const text = e.target.value;
                const legends = { ...key.legends };
                if (text === '') delete legends[slot];
                else legends[slot] = text;
                patch({ legends });
              }}
            />
          ))}
        </div>
      </Section>

      <Section title="形状">
        <SelectField label="形状" value={key.shape} options={SHAPE_OPTIONS} onChange={onShapeChange} testId="shape-select" />
        {HAS_SECONDARY_UI.has(key.shape) && key.secondary && (
          <>
            <DragNumberField label="X2" value={key.secondary.x} onChange={(x, ck) => patch({ secondary: { ...key.secondary!, x } }, ck)} suffix="U" />
            <DragNumberField label="Y2" value={key.secondary.y} onChange={(y, ck) => patch({ secondary: { ...key.secondary!, y } }, ck)} suffix="U" />
            <DragNumberField label="W2" value={key.secondary.w} onChange={(w, ck) => patch({ secondary: { ...key.secondary!, w } }, ck)} suffix="U" />
            <DragNumberField label="H2" value={key.secondary.h} onChange={(h, ck) => patch({ secondary: { ...key.secondary!, h } }, ck)} suffix="U" />
          </>
        )}
      </Section>

      <Section title="座標">
        <DragNumberField
          label="X"
          value={key.position.x}
          suffix="U"
          testId="position-x"
          onChange={(x, ck) => patch({ position: { ...key.position, x } }, ck)}
        />
        <DragNumberField
          label="Y"
          value={key.position.y}
          suffix="U"
          testId="position-y"
          onChange={(y, ck) => patch({ position: { ...key.position, y } }, ck)}
        />
      </Section>

      <Section title="寸法">
        <DragNumberField label="W" value={key.size.w} suffix="U" min={0.05} onChange={(w, ck) => patch({ size: { ...key.size, w } }, ck)} />
        <DragNumberField label="H" value={key.size.h} suffix="U" min={0.05} onChange={(h, ck) => patch({ size: { ...key.size, h } }, ck)} />
      </Section>

      <Section title="回転">
        <DragNumberField
          label="角度"
          value={key.rotation.angle}
          suffix="°"
          testId="rotation-angle"
          onChange={(angle, ck) => patch({ rotation: { angle, origin: key.rotation.origin } }, ck)}
        />
        <CheckboxField
          label="回転中心を座標指定"
          checked={usesOrigin}
          testId="rotation-origin-toggle"
          onChange={(checked) => {
            if (checked) patch({ rotation: { angle: key.rotation.angle, origin: displayedCenter } });
            else patch({ rotation: { angle: key.rotation.angle, origin: null } });
          }}
        />
        {usesOrigin && key.rotation.origin && (
          <>
            <DragNumberField
              label="中心 X"
              value={key.rotation.origin.x}
              suffix="U"
              onChange={(x, ck) => patch({ rotation: { angle: key.rotation.angle, origin: { ...key.rotation.origin!, x } } }, ck)}
            />
            <DragNumberField
              label="中心 Y"
              value={key.rotation.origin.y}
              suffix="U"
              onChange={(y, ck) => patch({ rotation: { angle: key.rotation.angle, origin: { ...key.rotation.origin!, y } } }, ck)}
            />
          </>
        )}
      </Section>

      <Section title="マトリクス">
        <DragNumberField
          label="Row"
          value={key.matrix?.row ?? null}
          testId="matrix-row"
          onChange={(row) => setMatrix(key.id, { row, col: key.matrix?.col ?? 0 })}
        />
        <DragNumberField
          label="Col"
          value={key.matrix?.col ?? null}
          testId="matrix-col"
          onChange={(col) => setMatrix(key.id, { row: key.matrix?.row ?? 0, col })}
        />
        <ActionButton label="未割り当てにする" testId="matrix-unassign" onClick={() => setMatrix(key.id, null)} disabled={key.matrix === null} />
      </Section>

      <Section title="フラグ">
        <CheckboxField label="デカール" checked={key.decal} onChange={(decal) => patch({ decal })} testId="flag-decal" />
        <CheckboxField label="ホーミング" checked={key.homing} onChange={(homing) => patch({ homing })} testId="flag-homing" />
        <CheckboxField label="ゴースト" checked={key.ghost} onChange={(ghost) => patch({ ghost })} testId="flag-ghost" />
      </Section>

      <Section title="色">
        <ColorField label="キーキャップ色" value={key.color} onChange={(color) => patch({ color })} />
        <ColorField label="刻印色" value={key.legendColor} onChange={(legendColor) => patch({ legendColor })} />
      </Section>

      <Section title="操作">
        <div className="kl-button-row">
          <ActionButton label="複製" testId="single-key-duplicate" onClick={() => duplicateAndSelect([key.id], { x: gridSize, y: gridSize })} />
          <ActionButton
            label="削除"
            danger
            testId="single-key-delete"
            onClick={() => {
              deleteKeys([key.id]);
              clearSelection();
            }}
          />
        </div>
      </Section>
    </div>
  );
}

export default KeyInspector;
