/**
 * キャンバス上でのツール別の操作 (選択・矩形選択・ドラッグ移動・複製・回転ハンドル・
 * Add Key ツールの配置)。docs/UI_SPEC.md#操作 / docs/GEOMETRY.md#選択判定 /
 * docs/GEOMETRY.md#複数選択の一括回転-オービット と 1 対 1。
 *
 * `useViewport` と同じ `containerRef` に `pointerdown`/`pointermove`/`pointerup`/
 * `pointercancel` を張る。`useViewport` は中ボタン・`Space` 押下・Pan ツールの
 * 左ドラッグだけを処理するので、それ以外の左ボタン単独ドラッグはここで処理する
 * (`spacePressed` / `activeTool==='pan'` のときはここでも何もしない)。
 *
 * ドラッグ中の状態はすべてこの effect のクロージャ内のローカル変数に持つ
 * (`useViewport` と同じ流儀)。矩形選択の見た目だけ React state
 * (`RubberBandState`) で返し、呼び出し側 (`CanvasArea`) が描画に使う。
 */
import { useEffect, useRef, useState } from 'react';
import { angleOfHandleFromPivot } from '@/core/geometry/rect';
import { keysIntersectingRect, type SelectionMode } from '@/core/geometry/select';
import { round4, snapAngle, snapMoveDelta } from '@/core/geometry/snap';
import { screenToLayout } from '@/core/geometry/units';
import type { AABB } from '@/core/geometry/shape';
import type { PointU } from '@/core/model/types';
import { duplicateAndSelect } from '@/state/actions';
import { useEditorStore, useProjectStore } from '@/state/appState';
import { selectionAABB } from '@/state/selectors';
import type { RubberBandState } from '@/ui/canvas/RubberBand';

type Mode = 'none' | 'rubberBand' | 'move' | 'rotate' | 'addKey';

const DEFAULT_KEY_SIZE = { w: 1, h: 1 };

function aabbFromTwoPoints(a: PointU, b: PointU): AABB {
  return { minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x), minY: Math.min(a.y, b.y), maxY: Math.max(a.y, b.y) };
}

function newCoalesceKey(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `gesture-${Date.now().toString()}-${Math.random().toString(36)}`;
}

function cellOf(pos: PointU, gridSize: number): { x: number; y: number } {
  const size = gridSize > 0 ? gridSize : 1;
  return { x: Math.floor(pos.x / size), y: Math.floor(pos.y / size) };
}

export function useCanvasInteraction<T extends HTMLElement>(containerRef: React.RefObject<T | null>): RubberBandState | null {
  const [rubberBand, setRubberBand] = useState<RubberBandState | null>(null);
  // pointerup ハンドラは React state (非同期) ではなく、この ref 経由で
  // 「今の矩形」を同期的に読む。
  const rubberBandRef = useRef<RubberBandState | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let mode: Mode = 'none';
    let activePointerId: number | null = null;

    // rubberBand
    let rubberStartLayout: PointU = { x: 0, y: 0 };
    let rubberMode: SelectionMode = 'intersect';
    let rubberBaseSelection: string[] = [];

    // move
    let moveIds: string[] = [];
    let moveAnchorStart: PointU = { x: 0, y: 0 };
    let movePointerStartLayout: PointU = { x: 0, y: 0 };
    let moveAppliedDelta: PointU = { x: 0, y: 0 };
    let moveCoalesceKey = '';

    // rotate
    let rotateIds: string[] = [];
    let rotatePivot: PointU = { x: 0, y: 0 };
    let rotateLastAngle = 0;
    let rotateCoalesceKey = '';

    // addKey
    let addKeyLastCell: { x: number; y: number } | null = null;

    function clientToLocal(clientX: number, clientY: number): PointU {
      const rect = el!.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function toLayout(clientX: number, clientY: number): PointU {
      const editor = useEditorStore.getState();
      return screenToLayout(clientToLocal(clientX, clientY), editor.scale, editor.panPx);
    }

    function updateRubberBand(next: RubberBandState | null): void {
      rubberBandRef.current = next;
      setRubberBand(next);
    }

    function applyClickSelection(keyId: string, shift: boolean): void {
      const editor = useEditorStore.getState();
      if (shift) {
        editor.selectKey(keyId, true);
        return;
      }
      if (editor.selectedKeyIds.includes(keyId) && editor.selectedKeyIds.length > 1) {
        return; // 既に複数選択の一部 → 選択を維持したままドラッグする
      }
      editor.selectKey(keyId, false);
    }

    function beginMove(ids: string[], anchorLayoutPos: PointU, pointerId: number): void {
      if (ids.length === 0) return;
      const project = useProjectStore.getState().project;
      // アンカーは「今回のドラッグを始めたキー」。複製直後は先頭の新キーを使う。
      const anchor = project.keys.find((k) => ids.includes(k.id));
      if (!anchor) return;

      mode = 'move';
      activePointerId = pointerId;
      moveIds = ids;
      moveAnchorStart = anchor.position;
      movePointerStartLayout = anchorLayoutPos;
      moveAppliedDelta = { x: 0, y: 0 };
      moveCoalesceKey = newCoalesceKey();
      el!.setPointerCapture(pointerId);
    }

    function beginRotate(ids: string[], pivot: PointU, startLayoutPos: PointU, pointerId: number): void {
      if (ids.length === 0) return;
      mode = 'rotate';
      activePointerId = pointerId;
      rotateIds = ids;
      rotatePivot = pivot;
      rotateLastAngle = angleOfHandleFromPivot(startLayoutPos, pivot);
      rotateCoalesceKey = newCoalesceKey();
      el!.setPointerCapture(pointerId);
    }

    function beginRubberBand(startLayoutPos: PointU, contain: boolean, pointerId: number): void {
      mode = 'rubberBand';
      activePointerId = pointerId;
      rubberStartLayout = startLayoutPos;
      rubberMode = contain ? 'contain' : 'intersect';
      rubberBaseSelection = [...useEditorStore.getState().selectedKeyIds];
      el!.setPointerCapture(pointerId);
      updateRubberBand({ box: aabbFromTwoPoints(startLayoutPos, startLayoutPos), contain });
    }

    function placeKeyAt(layoutPos: PointU, gridSize: number): void {
      const position = { x: layoutPos.x - DEFAULT_KEY_SIZE.w / 2, y: layoutPos.y - DEFAULT_KEY_SIZE.h / 2 };
      useProjectStore.getState().addKeys([{ position, size: { ...DEFAULT_KEY_SIZE } }], { gridSize });
    }

    function pivotOfSelection(): PointU | null {
      const editor = useEditorStore.getState();
      const project = useProjectStore.getState().project;
      const box = selectionAABB(project, editor.selectedKeyIds);
      if (!box) return null;
      return { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 };
    }

    function onPointerDown(e: PointerEvent): void {
      if (e.button !== 0 || mode !== 'none') return;
      const editor = useEditorStore.getState();
      if (editor.spacePressed || editor.activeTool === 'pan') return;

      const targetEl = e.target as Element;
      const isHandle = targetEl.closest('[data-testid="rotate-handle"]') !== null;
      const keyEl = targetEl.closest('[data-key-id]');
      const keyId = keyEl?.getAttribute('data-key-id') ?? null;
      const layoutPos = toLayout(e.clientX, e.clientY);

      if (isHandle) {
        const pivot = pivotOfSelection();
        if (pivot) beginRotate(editor.selectedKeyIds, pivot, layoutPos, e.pointerId);
        return;
      }

      if (editor.activeTool === 'addKey') {
        placeKeyAt(layoutPos, editor.gridSize);
        mode = 'addKey';
        activePointerId = e.pointerId;
        addKeyLastCell = cellOf(layoutPos, editor.gridSize);
        el!.setPointerCapture(e.pointerId);
        return;
      }

      if (keyId) {
        if (editor.activeTool === 'rotate') {
          applyClickSelection(keyId, e.shiftKey);
          const pivot = pivotOfSelection();
          if (pivot) beginRotate(useEditorStore.getState().selectedKeyIds, pivot, layoutPos, e.pointerId);
          return;
        }

        if (editor.activeTool !== 'select') return;

        if (e.altKey) {
          const base = editor.selectedKeyIds.includes(keyId) && editor.selectedKeyIds.length > 0 ? editor.selectedKeyIds : [keyId];
          duplicateAndSelect(base, { x: 0, y: 0 });
          const newIds = useEditorStore.getState().selectedKeyIds;
          beginMove(newIds, layoutPos, e.pointerId);
          return;
        }

        applyClickSelection(keyId, e.shiftKey);
        beginMove(useEditorStore.getState().selectedKeyIds, layoutPos, e.pointerId);
        return;
      }

      // 空白をクリック
      if (editor.activeTool === 'rotate') {
        const pivot = pivotOfSelection();
        if (pivot) beginRotate(editor.selectedKeyIds, pivot, layoutPos, e.pointerId);
        return;
      }
      if (editor.activeTool !== 'select') return;

      if (!e.shiftKey) editor.clearSelection();
      beginRubberBand(layoutPos, e.altKey, e.pointerId);
    }

    function onPointerMove(e: PointerEvent): void {
      if (mode === 'none' || e.pointerId !== activePointerId) return;
      const layoutPos = toLayout(e.clientX, e.clientY);

      if (mode === 'rubberBand') {
        updateRubberBand({ box: aabbFromTwoPoints(rubberStartLayout, layoutPos), contain: rubberMode === 'contain' });
        return;
      }

      if (mode === 'move') {
        const editor = useEditorStore.getState();
        const rawDelta: PointU = {
          x: layoutPos.x - movePointerStartLayout.x,
          y: layoutPos.y - movePointerStartLayout.y,
        };
        const snappedTotal = snapMoveDelta(moveAnchorStart, rawDelta, editor.gridSize, editor.snapEnabled);
        const incremental: PointU = {
          x: round4(snappedTotal.x - moveAppliedDelta.x),
          y: round4(snappedTotal.y - moveAppliedDelta.y),
        };
        if (incremental.x !== 0 || incremental.y !== 0) {
          useProjectStore.getState().moveKeys(moveIds, incremental, moveCoalesceKey);
          moveAppliedDelta = snappedTotal;
        }
        return;
      }

      if (mode === 'rotate') {
        const rawAngle = angleOfHandleFromPivot(layoutPos, rotatePivot);
        const angle = snapAngle(rawAngle, e.shiftKey);
        const delta = round4(angle - rotateLastAngle);
        if (delta !== 0) {
          useProjectStore.getState().rotateKeys(rotateIds, delta, {}, rotateCoalesceKey);
          rotateLastAngle = angle;
        }
        return;
      }

      if (mode === 'addKey') {
        const editor = useEditorStore.getState();
        const cell = cellOf(layoutPos, editor.gridSize);
        if (!addKeyLastCell || cell.x !== addKeyLastCell.x || cell.y !== addKeyLastCell.y) {
          placeKeyAt(layoutPos, editor.gridSize);
          addKeyLastCell = cell;
        }
      }
    }

    function finalizeRubberBand(): void {
      const box = rubberBandRef.current?.box;
      if (box) {
        const project = useProjectStore.getState().project;
        const matched = keysIntersectingRect(project.keys, box, rubberMode);
        const finalSelection = Array.from(new Set([...rubberBaseSelection, ...matched]));
        useEditorStore.getState().selectKeys(finalSelection);
      }
      updateRubberBand(null);
    }

    function endPointer(e: PointerEvent): void {
      if (e.pointerId !== activePointerId) return;
      if (mode === 'rubberBand') finalizeRubberBand();
      if (el!.hasPointerCapture(e.pointerId)) el!.releasePointerCapture(e.pointerId);
      mode = 'none';
      activePointerId = null;
    }

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', endPointer);
    el.addEventListener('pointercancel', endPointer);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', endPointer);
      el.removeEventListener('pointercancel', endPointer);
    };
  }, [containerRef]);

  return rubberBand;
}
