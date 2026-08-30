/**
 * キーボードショートカット一式。docs/UI_SPEC.md#キーボードショートカット と 1 対 1。
 * `App.tsx` で 1 回だけ呼ぶ。`window` に `keydown`/`keyup`/`blur` を 1 組ずつ登録し、
 * ハンドラ内は毎回 `getState()` で最新のストアを読む (`useBootstrap.ts` と同じ流儀。
 * 依存配列を空にして effect を張り直さないため)。
 *
 * 入力欄にフォーカスがあるときは、修飾キー無しの単独ショートカット (`V`/`K`/`R`/`H`/
 * 矢印/`Delete`/`Tab` 等) を無効にする。`Esc` と `Cmd/Ctrl` 併用のものは常に有効
 * (UI_SPEC.md の記載どおり)。
 *
 * このセッションでは以下を意図的に対象外にしている (M2-4 で UI ごと追加する):
 * `Cmd/Ctrl+K` (コマンドパレット)、`?` (ショートカット一覧)、`Cmd/Ctrl+S` (明示保存 —
 * 自動保存は既に動作しており、フィードバック UI が無い状態で先に足す価値が薄いため)。
 */
import { useEffect } from 'react';
import { fitToAABB } from '@/core/geometry/viewport';
import { aabbOfKeys } from '@/core/geometry/shape';
import type { KeyModel, PointU, ProjectModel } from '@/core/model/types';
import { duplicateAndSelect } from '@/state/actions';
import { useEditorStore, useProjectStore } from '@/state/appState';
import { selectedKeysOf, selectionAABB } from '@/state/selectors';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

function compareYThenX(a: KeyModel, b: KeyModel): number {
  if (a.position.y !== b.position.y) return a.position.y - b.position.y;
  return a.position.x - b.position.x;
}

/** Tab / Shift+Tab で次 / 前に選択するキーの id (Y→X の順に巡回)。 */
function cycleSelectionId(project: ProjectModel, selectedKeyIds: readonly string[], direction: 1 | -1): string | null {
  if (project.keys.length === 0) return null;
  const sorted = [...project.keys].sort(compareYThenX);
  const currentId = selectedKeyIds.length === 1 ? selectedKeyIds[0] : null;
  const currentIndex = currentId ? sorted.findIndex((k) => k.id === currentId) : -1;
  const nextIndex = currentIndex === -1 ? (direction === 1 ? 0 : sorted.length - 1) : (currentIndex + direction + sorted.length) % sorted.length;
  return sorted[nextIndex]!.id;
}

function handleMetaShortcut(e: KeyboardEvent): void {
  const projectStore = useProjectStore.getState();
  const editor = useEditorStore.getState();

  switch (e.key.toLowerCase()) {
    case 'z':
      e.preventDefault();
      if (e.shiftKey) projectStore.redo();
      else projectStore.undo();
      return;
    case 'y':
      e.preventDefault();
      projectStore.redo();
      return;
    case 'a':
      e.preventDefault();
      editor.selectKeys(projectStore.project.keys.map((k) => k.id));
      return;
    case 'd':
      e.preventDefault();
      duplicateAndSelect(editor.selectedKeyIds, { x: editor.gridSize, y: editor.gridSize });
      return;
    case 'g':
      e.preventDefault();
      editor.toggleSnap();
      return;
    case 'm':
      e.preventDefault();
      editor.toggleShowMatrix();
      return;
    case 'c': {
      e.preventDefault();
      const keys = selectedKeysOf(projectStore.project, editor.selectedKeyIds);
      if (keys.length > 0) editor.setClipboard(keys);
      return;
    }
    case 'v': {
      e.preventDefault();
      if (editor.clipboard.length === 0) return;
      const offset: PointU = { x: editor.gridSize, y: editor.gridSize };
      const before = new Set(projectStore.project.keys.map((k) => k.id));
      const partials = editor.clipboard.map((k) => ({
        ...k,
        position: { x: k.position.x + offset.x, y: k.position.y + offset.y },
      }));
      projectStore.addKeys(partials);
      const after = useProjectStore.getState().project.keys;
      const newIds = after.filter((k) => !before.has(k.id)).map((k) => k.id);
      if (newIds.length > 0) editor.selectKeys(newIds);
      return;
    }
    default:
      break;
  }

  if (e.code === 'Digit0') {
    e.preventDefault();
    editor.setScale(1);
  }
}

function handlePlainShortcut(e: KeyboardEvent): void {
  const projectStore = useProjectStore.getState();
  const editor = useEditorStore.getState();

  if (e.shiftKey && (e.code === 'Digit1' || e.code === 'Digit2')) {
    e.preventDefault();
    const aabb = e.code === 'Digit1' ? aabbOfKeys(projectStore.project.keys) : selectionAABB(projectStore.project, editor.selectedKeyIds);
    if (!aabb) return;
    const next = fitToAABB(aabb, editor.viewportPx, 1);
    editor.setViewport(next.scale, next.panPx);
    return;
  }

  switch (e.key) {
    case 'v':
    case 'V':
      editor.setActiveTool('select');
      return;
    case 'k':
    case 'K':
      editor.setActiveTool('addKey');
      return;
    case 'r':
    case 'R':
      editor.setActiveTool('rotate');
      return;
    case 'h':
    case 'H':
      editor.setActiveTool('pan');
      return;
    case 'Delete':
    case 'Backspace': {
      if (editor.selectedKeyIds.length === 0) return;
      projectStore.deleteKeys(editor.selectedKeyIds);
      editor.clearSelection();
      return;
    }
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight': {
      if (editor.selectedKeyIds.length === 0) return;
      e.preventDefault();
      const step = e.shiftKey ? 1 : editor.gridSize;
      const delta: PointU = { x: 0, y: 0 };
      if (e.key === 'ArrowUp') delta.y = -step;
      if (e.key === 'ArrowDown') delta.y = step;
      if (e.key === 'ArrowLeft') delta.x = -step;
      if (e.key === 'ArrowRight') delta.x = step;
      projectStore.moveKeys(editor.selectedKeyIds, delta);
      return;
    }
    case 'Tab': {
      const nextId = cycleSelectionId(projectStore.project, editor.selectedKeyIds, e.shiftKey ? -1 : 1);
      if (!nextId) return;
      e.preventDefault();
      editor.selectKeys([nextId]);
      return;
    }
    default:
      break;
  }
}

export function useGlobalShortcuts(): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      const editor = useEditorStore.getState();
      const editable = isEditableTarget(e.target);

      if (e.code === 'Space' && !e.repeat) {
        editor.setSpacePressed(true);
        if (!editable) e.preventDefault();
        return;
      }

      if (e.key === 'Escape') {
        editor.clearSelection();
        editor.setActiveTool('select');
        return;
      }

      const meta = e.metaKey || e.ctrlKey;
      if (meta) {
        handleMetaShortcut(e);
        return;
      }

      if (editable) return;
      handlePlainShortcut(e);
    }

    function onKeyUp(e: KeyboardEvent): void {
      if (e.code === 'Space') useEditorStore.getState().setSpacePressed(false);
    }

    function onBlur(): void {
      // タブ切替等で keyup を取り逃がして Space が押しっぱなし扱いのまま
      // 残らないようにする (旧アプリの既知バグへの対策)。
      useEditorStore.getState().setSpacePressed(false);
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
}
