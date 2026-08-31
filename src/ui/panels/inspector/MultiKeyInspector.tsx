/**
 * 複数選択時のインスペクタ。docs/UI_SPEC.md#複数選択。
 * 一括編集で値が揃っていないフィールドは「—」(`null`) を表示し、
 * 入力すると選択キー全体に適用する。W/H/回転角/形状/マトリクス Row は
 * 各キーの他フィールド (H, 回転中心, secondary, Col) を保つため
 * `state/actions.ts` の `applyBulkKeyProps` / `applyBulkMatrixRow` 経由で
 * キーごとに patch を組み立てる。
 */
import { useState } from 'react';
import { aabbOfKeys } from '@/core/geometry/shape';
import { round4 } from '@/core/geometry/snap';
import { defaultSecondaryFor } from '@/core/model/key';
import type { KeyModel, KeyShape } from '@/core/model/types';
import type { AlignEdge } from '@/core/commands/alignKeys';
import type { DistributeAxis } from '@/core/commands/distributeKeys';
import { applyBulkKeyProps, applyBulkMatrixRow, duplicateAndSelect } from '@/state/actions';
import { useEditorStore, useProjectStore } from '@/state/appState';
import { selectedKeysOf } from '@/state/selectors';
import { ActionButton, DragNumberField, Section, SelectField } from './fields';

const SHAPE_OPTIONS: { value: KeyShape; label: string }[] = [
  { value: 'rect', label: '矩形' },
  { value: 'isoEnter', label: 'ISO Enter' },
  { value: 'steppedCaps', label: 'ステップド' },
  { value: 'bigAssEnter', label: 'Big-Ass Enter' },
  { value: 'custom', label: 'カスタム' },
];

const ALIGN_EDGES: { edge: AlignEdge; label: string }[] = [
  { edge: 'left', label: '左' },
  { edge: 'centerH', label: '水平中央' },
  { edge: 'right', label: '右' },
  { edge: 'top', label: '上' },
  { edge: 'centerV', label: '垂直中央' },
  { edge: 'bottom', label: '下' },
];

/** 選択キー全体で値が揃っていれば値を、揃っていなければ null を返す。 */
function uniformValue<T>(keys: readonly KeyModel[], getter: (key: KeyModel) => T): T | null {
  if (keys.length === 0) return null;
  const first = getter(keys[0]!);
  for (const key of keys.slice(1)) {
    if (getter(key) !== first) return null;
  }
  return first;
}

function shapePatchFor(shape: KeyShape, key: KeyModel): Partial<KeyModel> {
  if (shape === 'rect') return { shape, secondary: null, polygon: null };
  if (shape === 'custom') {
    const fallbackPolygon = key.polygon ?? [
      { x: 0, y: 0 },
      { x: key.size.w, y: 0 },
      { x: key.size.w, y: key.size.h },
      { x: 0, y: key.size.h },
    ];
    return { shape, secondary: null, polygon: fallbackPolygon };
  }
  return { shape, secondary: defaultSecondaryFor(shape, key.size), polygon: null };
}

interface MultiKeyInspectorProps {
  keyIds: string[];
}

function MultiKeyInspector({ keyIds }: MultiKeyInspectorProps) {
  const project = useProjectStore((s) => s.project);
  const updateKeyProps = useProjectStore((s) => s.updateKeyProps);
  const alignKeys = useProjectStore((s) => s.alignKeys);
  const distributeKeys = useProjectStore((s) => s.distributeKeys);
  const autoAssignMatrix = useProjectStore((s) => s.autoAssignMatrix);
  const deleteKeys = useProjectStore((s) => s.deleteKeys);
  const gridSize = useEditorStore((s) => s.gridSize);
  const clearSelection = useEditorStore((s) => s.clearSelection);

  const [startRow, setStartRow] = useState(0);
  const [startCol, setStartCol] = useState(0);

  const keys = selectedKeysOf(project, keyIds);
  const box = aabbOfKeys(keys);

  if (keys.length === 0) return null;

  const uniformW = uniformValue(keys, (k) => k.size.w);
  const uniformH = uniformValue(keys, (k) => k.size.h);
  const uniformAngle = uniformValue(keys, (k) => k.rotation.angle);
  const uniformShape = uniformValue(keys, (k) => k.shape);
  const uniformRow = uniformValue(keys, (k) => k.matrix?.row ?? null);
  const uniformColor = uniformValue(keys, (k) => k.color);

  return (
    <div className="kl-inspector" data-testid="multi-key-inspector">
      <Section title="概要">
        <p className="kl-inspector-summary" data-testid="multi-summary">{`${keys.length.toString()} 個のキーを選択中`}</p>
        {box && (
          <p className="kl-inspector-summary">{`範囲: ${round4(box.maxX - box.minX).toString()}U × ${round4(box.maxY - box.minY).toString()}U`}</p>
        )}
      </Section>

      <Section title="一括編集">
        <DragNumberField
          label="W"
          value={uniformW}
          suffix="U"
          min={0.05}
          testId="bulk-w"
          onChange={(w) => applyBulkKeyProps(keyIds, (key) => ({ size: { ...key.size, w } }))}
        />
        <DragNumberField
          label="H"
          value={uniformH}
          suffix="U"
          min={0.05}
          testId="bulk-h"
          onChange={(h) => applyBulkKeyProps(keyIds, (key) => ({ size: { ...key.size, h } }))}
        />
        <DragNumberField
          label="回転角"
          value={uniformAngle}
          suffix="°"
          testId="bulk-angle"
          onChange={(angle) => applyBulkKeyProps(keyIds, (key) => ({ rotation: { angle, origin: key.rotation.origin } }))}
        />
        <SelectField
          label="形状"
          value={uniformShape}
          options={SHAPE_OPTIONS}
          testId="bulk-shape"
          onChange={(shape) => applyBulkKeyProps(keyIds, (key) => shapePatchFor(shape, key))}
        />
        <DragNumberField
          label="マトリクス Row"
          value={uniformRow}
          testId="bulk-matrix-row"
          onChange={(row) => applyBulkMatrixRow(keyIds, Math.round(row))}
        />
        <label className="kl-field">
          <span className="kl-field-label">色</span>
          <input
            data-testid="bulk-color"
            className="kl-field-color"
            type="color"
            value={uniformColor ?? '#000000'}
            onChange={(e) => updateKeyProps(keyIds, { color: e.target.value })}
          />
        </label>
      </Section>

      <Section title="整列">
        <div className="kl-button-row">
          {ALIGN_EDGES.map(({ edge, label }) => (
            <ActionButton key={edge} label={label} testId={`align-${edge}`} onClick={() => alignKeys(keyIds, edge)} disabled={keys.length < 2} />
          ))}
        </div>
      </Section>

      <Section title="分布">
        <div className="kl-button-row">
          {(['horizontal', 'vertical'] as DistributeAxis[]).map((axis) => (
            <ActionButton
              key={axis}
              label={axis === 'horizontal' ? '水平方向に等間隔' : '垂直方向に等間隔'}
              testId={`distribute-${axis}`}
              onClick={() => distributeKeys(keyIds, axis)}
              disabled={keys.length < 3}
            />
          ))}
        </div>
      </Section>

      <Section title="マトリクス">
        <DragNumberField label="開始 Row" value={startRow} onChange={(v) => setStartRow(Math.round(v))} />
        <DragNumberField label="開始 Col" value={startCol} onChange={(v) => setStartCol(Math.round(v))} />
        <ActionButton
          label="マトリクス自動割り当て (選択キーのみ)"
          testId="auto-assign-selected"
          onClick={() => autoAssignMatrix(keyIds, { startRow, startCol })}
        />
      </Section>

      <Section title="操作">
        <div className="kl-button-row">
          <ActionButton label="複製" testId="multi-duplicate" onClick={() => duplicateAndSelect(keyIds, { x: gridSize, y: gridSize })} />
          <ActionButton
            label="削除"
            danger
            testId="multi-delete"
            onClick={() => {
              deleteKeys(keyIds);
              clearSelection();
            }}
          />
        </div>
      </Section>
    </div>
  );
}

export default MultiKeyInspector;
