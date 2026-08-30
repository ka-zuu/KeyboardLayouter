/**
 * ビューポート操作 (ズーム・パン・ピンチ)。docs/UI_SPEC.md#キャンバス の「操作」表、
 * docs/GEOMETRY.md#ズームとパン と 1 対 1。Pointer Events で実装する。
 *
 * - ホイール: カーソル位置を固定点にズーム
 * - `Shift` + ホイール: 横スクロール
 * - 中ボタンドラッグ / `Space` 押下中の左ドラッグ / Pan ツール選択中の左ドラッグ: パン
 *   (Select ツール中でもツールを切り替えずにパンできる、という仕様に従い
 *   ツールの種類を問わずここで処理する)
 * - 2 本指ピンチ: パンとズームを同時に
 *
 * `Space` 押下状態は `editorStore.spacePressed` で管理する (`ui/hooks/useGlobalShortcuts.ts`
 * が keydown/keyup を監視して更新する)。ここでは読むだけ。
 */
import { useEffect, useRef } from 'react';
import { clampScale, scaleFromWheelDelta, zoomAt, type Viewport } from '@/core/geometry/viewport';
import type { PointU } from '@/core/model/types';
import { useEditorStore } from '@/state/appState';

export function useViewport<T extends HTMLElement>(containerRef: React.RefObject<T | null>): void {
  const scale = useEditorStore((s) => s.scale);
  const panPx = useEditorStore((s) => s.panPx);
  const setViewport = useEditorStore((s) => s.setViewport);

  // イベントハンドラはクロージャで最新の scale/panPx を見る必要があるが、
  // effect を毎レンダー張り直したくないので ref 経由で読む。
  // ref への書き込みはレンダー中に行えない (react-hooks/refs) ため、
  // 毎レンダー後に走る素の useEffect で同期する。
  const viewportRef = useRef<Viewport>({ scale, panPx });
  useEffect(() => {
    viewportRef.current = { scale, panPx };
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let panning = false;
    let panPointerId: number | null = null;
    let panStartClient: PointU = { x: 0, y: 0 };
    let panStartPanPx: PointU = { x: 0, y: 0 };

    const pointers = new Map<number, PointU>();
    let pinchStartDist = 0;
    let pinchStartScale = 1;
    let pinchStartMidClient: PointU = { x: 0, y: 0 };
    let pinchStartPanPx: PointU = { x: 0, y: 0 };

    function clientToLocal(clientX: number, clientY: number): PointU {
      const rect = el!.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function onWheel(e: WheelEvent): void {
      e.preventDefault();
      const current = viewportRef.current;

      if (e.shiftKey) {
        setViewport(current.scale, { x: current.panPx.x - e.deltaY, y: current.panPx.y });
        return;
      }

      const cursorPx = clientToLocal(e.clientX, e.clientY);
      const nextScale = scaleFromWheelDelta(current.scale, e.deltaY);
      const next = zoomAt(current, cursorPx, nextScale);
      setViewport(next.scale, next.panPx);
    }

    function onPointerDown(e: PointerEvent): void {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 2) {
        panning = false;
        pinchStartDist = 0; // onPointerMove で初期化する
        return;
      }

      const editor = useEditorStore.getState();
      const isMiddleButton = e.button === 1;
      const isSpacePan = e.button === 0 && editor.spacePressed;
      const isPanTool = e.button === 0 && editor.activeTool === 'pan';
      if (isMiddleButton || isSpacePan || isPanTool) {
        panning = true;
        panPointerId = e.pointerId;
        panStartClient = { x: e.clientX, y: e.clientY };
        panStartPanPx = viewportRef.current.panPx;
        el!.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    }

    function onPointerMove(e: PointerEvent): void {
      if (pointers.has(e.pointerId)) {
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()] as [PointU, PointU];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

        if (pinchStartDist === 0) {
          pinchStartDist = dist || 1;
          pinchStartScale = viewportRef.current.scale;
          pinchStartMidClient = mid;
          pinchStartPanPx = viewportRef.current.panPx;
          return;
        }

        const anchorLocal = clientToLocal(pinchStartMidClient.x, pinchStartMidClient.y);
        const nextScale = clampScale(pinchStartScale * (dist / pinchStartDist));
        const zoomed = zoomAt({ scale: pinchStartScale, panPx: pinchStartPanPx }, anchorLocal, nextScale);
        const nextPanPx = {
          x: zoomed.panPx.x + (mid.x - pinchStartMidClient.x),
          y: zoomed.panPx.y + (mid.y - pinchStartMidClient.y),
        };
        setViewport(nextScale, nextPanPx);
        return;
      }

      if (!panning || e.pointerId !== panPointerId) return;
      const dx = e.clientX - panStartClient.x;
      const dy = e.clientY - panStartClient.y;
      setViewport(viewportRef.current.scale, { x: panStartPanPx.x + dx, y: panStartPanPx.y + dy });
    }

    function endPointer(e: PointerEvent): void {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStartDist = 0;
      if (panning && e.pointerId === panPointerId) {
        panning = false;
        panPointerId = null;
        if (el!.hasPointerCapture(e.pointerId)) el!.releasePointerCapture(e.pointerId);
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', endPointer);
    el.addEventListener('pointercancel', endPointer);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', endPointer);
      el.removeEventListener('pointercancel', endPointer);
    };
  }, [containerRef, setViewport]);
}
