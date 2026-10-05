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
 * 表示用のショートカット一覧は `ui/command/shortcuts.ts`。ここを変えたらそちらも揃える。
 */
import { useEffect } from 'react';
import type { KeyModel, PointU, ProjectModel } from '@/core/model/types';
import {
  copySelection,
  deleteSelection,
  duplicateSelection,
  fitAll,
  fitSelection,
  pasteClipboard,
  resetZoom,
  selectAll,
  startLegendEditOfSelection,
} from '@/state/actions';
import { useEditorStore, useProjectStore } from '@/state/appState';
import { saveAndNotify } from '@/state/projectActions';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

function isActivatableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('button, a, select, summary, [role="button"], [role="menuitem"]') !== null;
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

/**
 * `\` キーか。`Alt` 併用時の Mac は `e.key` が別の文字になるため `e.code` も見る。
 * JIS 配列の `\` (`IntlRo`) と `¥` (`IntlYen`) も受け付ける。
 */
function isBackslashKey(e: KeyboardEvent): boolean {
  return e.key === '\\' || e.code === 'Backslash' || e.code === 'IntlRo' || e.code === 'IntlYen';
}

function handleMetaShortcut(e: KeyboardEvent): void {
  const projectStore = useProjectStore.getState();
  const editor = useEditorStore.getState();

  if (isBackslashKey(e)) {
    e.preventDefault();
    if (e.altKey) editor.toggleRightPanel();
    else editor.toggleLeftPanel();
    return;
  }

  switch (e.key.toLowerCase()) {
    case 'k':
      e.preventDefault();
      editor.setOverlay('commandPalette');
      return;
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
      selectAll();
      return;
    case 'd':
      e.preventDefault();
      duplicateSelection();
      return;
    case 's':
      // ブラウザの「ページを保存」を出さないよう、常に既定動作を止める。
      e.preventDefault();
      void saveAndNotify();
      return;
    case 'g':
      e.preventDefault();
      editor.toggleSnap();
      return;
    case 'm':
      e.preventDefault();
      editor.toggleShowMatrix();
      return;
    case 'c':
      e.preventDefault();
      copySelection();
      return;
    case 'v':
      e.preventDefault();
      pasteClipboard();
      return;
    default:
      break;
  }

  if (e.code === 'Digit0') {
    e.preventDefault();
    resetZoom();
  }
}

function handlePlainShortcut(e: KeyboardEvent): void {
  const projectStore = useProjectStore.getState();
  const editor = useEditorStore.getState();

  if (e.shiftKey && (e.code === 'Digit1' || e.code === 'Digit2')) {
    e.preventDefault();
    if (e.code === 'Digit1') fitAll();
    else fitSelection();
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
    case 'Backspace':
      deleteSelection();
      return;
    case 'Enter':
      // キーボードだけで刻印編集に入れるようにする (docs/UI_SPEC.md#アクセシビリティ)。
      // ボタン等にフォーカスがあるときは、その要素の Enter (押下) を優先する。
      if (editor.selectedKeyIds.length !== 1 || isActivatableTarget(e.target)) return;
      e.preventDefault();
      startLegendEditOfSelection();
      return;
    case '?':
      e.preventDefault();
      editor.setOverlay('shortcutHelp');
      return;
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
