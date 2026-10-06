/**
 * 複数のフック (グローバルショートカット・キャンバス操作) から共有する、
 * ストアをまたぐ小さな複合アクション。単なる 1 アクションの呼び出しに
 * 収まらないもの (id の差分計算を伴う複製など) をここに置く。
 */
import { aabbOfKeys } from '@/core/geometry/shape';
import { snapU } from '@/core/geometry/snap';
import { screenToLayout } from '@/core/geometry/units';
import { fitToAABB, zoomAt } from '@/core/geometry/viewport';
import { cloneKey, primaryLegendSlotOf, withLegend } from '@/core/model/key';
import { presetPartials, type KeyPreset } from '@/core/model/presets';
import { replaceProjectContent } from '@/core/model/project';
import type { KeyModel, MatrixAddress, PointU, ProjectModel } from '@/core/model/types';
import { useEditorStore, useProjectStore } from './appState';
import { selectedKeysOf, selectionAABB } from './selectors';

function newActionId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `action-${Date.now().toString()}-${Math.random().toString(36)}`;
}

/**
 * 指定したキーを複製し、新しく増えた id を選択状態にする。
 * `duplicateKeys` コマンド自体は他の `core/commands/*` と同じ
 * `(project, args) => project` の契約を保つため新 id を返さない
 * (docs/ARCHITECTURE.md#状態管理と履歴)。そのため呼ぶ前後の id 差分を取って
 * 新しく増えた id を判定する。
 */
export function duplicateAndSelect(ids: readonly string[], offsetU: PointU): void {
  if (ids.length === 0) return;
  const before = new Set(useProjectStore.getState().project.keys.map((k) => k.id));
  useProjectStore.getState().duplicateKeys(ids, offsetU);
  const after = useProjectStore.getState().project.keys;
  const newIds = after.filter((k) => !before.has(k.id)).map((k) => k.id);
  if (newIds.length > 0) useEditorStore.getState().selectKeys(newIds);
}

/**
 * 複数選択の一括編集 (docs/UI_SPEC.md#複数選択)。`updateKeyProps` の patch は
 * 1 つのオブジェクトを対象キー全体に一律適用するため、そのまま複数キーに渡すと
 * 編集していないフィールド (例: W だけ変えたいのに H も揃ってしまう) まで
 * 巻き込んでしまう。ここでは対象キーごとに `patchOf(key)` で個別の patch を
 * 組み立てて 1 件ずつ適用し、同じ `coalesceKey` で呼ぶことで履歴は 1 段にまとめる
 * (`state/history.ts` の coalesce は「直前の entry と同じ id なら差し替え」なので、
 * 同期的なループ内で使う分には問題ない)。
 */
export function applyBulkKeyProps(ids: readonly string[], patchOf: (key: KeyModel) => Partial<KeyModel>): void {
  if (ids.length === 0) return;
  const coalesceKey = newActionId();
  const snapshot = useProjectStore.getState().project.keys;
  for (const id of ids) {
    const key = snapshot.find((k) => k.id === id);
    if (!key) continue;
    useProjectStore.getState().updateKeyProps([id], patchOf(key), coalesceKey);
  }
}

/**
 * 複数選択の一括マトリクス Row 編集。Col は各キーの現在値を保つ。
 * `setMatrix` コマンドは `coalesceKey` を受け取らない (常に 1 件ずつ確定させる
 * 操作のため) ので、代わりに `updateKeyProps` (`matrix` フィールドを直接差し替え)
 * を使い `applyBulkKeyProps` と同じ結合ロジックに乗せる。
 */
export function applyBulkMatrixRow(ids: readonly string[], row: number): void {
  applyBulkKeyProps(ids, (key): Partial<KeyModel> => {
    const matrix: MatrixAddress = { row, col: key.matrix?.col ?? 0 };
    return { matrix };
  });
}

/** addKeys の前後で増えた id を選択状態にする (duplicateAndSelect と同じ差分方式)。 */
function addKeysAndSelect(partials: readonly Partial<KeyModel>[], gridSize?: number): void {
  if (partials.length === 0) return;
  const before = new Set(useProjectStore.getState().project.keys.map((k) => k.id));
  useProjectStore.getState().addKeys(partials, gridSize === undefined ? {} : { gridSize });
  const newIds = useProjectStore
    .getState()
    .project.keys.filter((k) => !before.has(k.id))
    .map((k) => k.id);
  if (newIds.length > 0) useEditorStore.getState().selectKeys(newIds);
}

/** すべて選択 (`Cmd/Ctrl+A`)。 */
export function selectAll(): void {
  useEditorStore.getState().selectKeys(useProjectStore.getState().project.keys.map((k) => k.id));
}

/** 選択中のキーを削除して選択を解除する (`Delete` / `Backspace`)。 */
export function deleteSelection(): void {
  const editor = useEditorStore.getState();
  if (editor.selectedKeyIds.length === 0) return;
  useProjectStore.getState().deleteKeys(editor.selectedKeyIds);
  editor.clearSelection();
}

/** 選択中のキーを複製し、グリッド幅だけずらして選択する (`Cmd/Ctrl+D`)。 */
export function duplicateSelection(): void {
  const { selectedKeyIds, gridSize } = useEditorStore.getState();
  duplicateAndSelect(selectedKeyIds, { x: gridSize, y: gridSize });
}

/** 選択中のキーをクリップボードへ (`Cmd/Ctrl+C`)。 */
export function copySelection(): void {
  const editor = useEditorStore.getState();
  const keys = selectedKeysOf(useProjectStore.getState().project, editor.selectedKeyIds);
  if (keys.length > 0) editor.setClipboard(keys);
}

/** クリップボードのキーをグリッド幅だけずらして貼り付け、選択する (`Cmd/Ctrl+V`)。 */
export function pasteClipboard(): void {
  const { clipboard, gridSize } = useEditorStore.getState();
  if (clipboard.length === 0) return;
  // addKeys は partial の id をそのまま使うので、cloneKey で id を振り直す (元のキーと id が重複しないように)。
  addKeysAndSelect(
    clipboard.map((k) => {
      const copy = cloneKey(k);
      return { ...copy, position: { x: k.position.x + gridSize, y: k.position.y + gridSize } };
    }),
  );
}

/**
 * キャンバス上での主刻印の直接編集を始める (ダブルクリック / `Enter`、docs/UI_SPEC.md#操作)。
 * 対象キーだけを選択した状態にする。
 */
export function startLegendEdit(keyId: string): void {
  if (!useProjectStore.getState().project.keys.some((k) => k.id === keyId)) return;
  const editor = useEditorStore.getState();
  editor.selectKeys([keyId]);
  editor.setEditingLegendKeyId(keyId);
}

/** 単一選択中のキーの主刻印の直接編集を始める。単一選択でなければ何もしない。 */
export function startLegendEditOfSelection(): void {
  const { selectedKeyIds } = useEditorStore.getState();
  if (selectedKeyIds.length === 1) startLegendEdit(selectedKeyIds[0]!);
}

/** 直接編集を確定する。`text === null` なら取り消し。内容が変わらなければ履歴に積まない。 */
export function finishLegendEdit(text: string | null): void {
  const editor = useEditorStore.getState();
  const keyId = editor.editingLegendKeyId;
  if (keyId === null) return;
  editor.setEditingLegendKeyId(null);
  if (text === null) return;
  const key = useProjectStore.getState().project.keys.find((k) => k.id === keyId);
  if (!key) return;
  const slot = primaryLegendSlotOf(key);
  if ((key.legends[slot] ?? '') === text) return;
  useProjectStore.getState().updateKeyProps([keyId], { legends: withLegend(key.legends, slot, text) });
}

/** キャンバス中央のレイアウト座標 (U)。 */
function canvasCenterU(): PointU {
  const { viewportPx, scale, panPx } = useEditorStore.getState();
  return screenToLayout({ x: viewportPx.width / 2, y: viewportPx.height / 2 }, scale, panPx);
}

/**
 * プリセットを `count` 個追加し、追加したキーを選択する (docs/UI_SPEC.md#キー追加-プリセット)。
 * `centerU` は並べたキー全体の中心。省略時はキャンバス中央 (クリック追加)、
 * D&D ではドロップ位置を渡す。左上はグリッドにスナップし、既存キーと重なる場合は
 * `addKeys` の gridSize 指定で右へずらす (docs/UI_SPEC.md#キーの重なり)。
 */
export function addPresetKeys(preset: KeyPreset, count: number, centerU: PointU = canvasCenterU()): void {
  const { gridSize, snapEnabled } = useEditorStore.getState();
  const size = preset.partial.size ?? { w: 1, h: 1 };
  const n = presetPartials(preset, count, { x: 0, y: 0 }).length;
  const origin = {
    x: snapU(centerU.x - (size.w * n) / 2, gridSize, snapEnabled),
    y: snapU(centerU.y - size.h / 2, gridSize, snapEnabled),
  };
  addKeysAndSelect(presetPartials(preset, n, origin), gridSize);
}

/** ツールバーの `+` / `-` の倍率ステップ。 */
export const ZOOM_STEP = 1.25;

/** キャンバス中央を固定点に倍率を `nextScale` にする。 */
function zoomTo(nextScale: number): void {
  const editor = useEditorStore.getState();
  const center = { x: editor.viewportPx.width / 2, y: editor.viewportPx.height / 2 };
  const next = zoomAt({ scale: editor.scale, panPx: editor.panPx }, center, nextScale);
  editor.setViewport(next.scale, next.panPx);
}

/** キャンバス中央を固定点に `factor` 倍ズームする。 */
export function zoomBy(factor: number): void {
  zoomTo(useEditorStore.getState().scale * factor);
}

/** 100% 表示 (`Cmd/Ctrl+0`)。キャンバス中央を固定点にする。 */
export function resetZoom(): void {
  setZoomPercent(100);
}

/**
 * 倍率を % で直接指定する (ツールバーの倍率表示への直接入力)。キャンバス中央を固定点にする。
 * 範囲外は `clampScale` で丸める (docs/GEOMETRY.md#ズームとパン)。
 */
export function setZoomPercent(percent: number): void {
  if (!Number.isFinite(percent) || percent <= 0) return;
  zoomTo(percent / 100);
}

/** 全体を表示 (`Shift+1`)。 */
export function fitAll(): void {
  const editor = useEditorStore.getState();
  const aabb = aabbOfKeys(useProjectStore.getState().project.keys);
  if (!aabb) return;
  const next = fitToAABB(aabb, editor.viewportPx, 1);
  editor.setViewport(next.scale, next.panPx);
}

/** 選択にズーム (`Shift+2`)。 */
export function fitSelection(): void {
  const editor = useEditorStore.getState();
  const aabb = selectionAABB(useProjectStore.getState().project, editor.selectedKeyIds);
  if (!aabb) return;
  const next = fitToAABB(aabb, editor.viewportPx, 1);
  editor.setViewport(next.scale, next.panPx);
}

/**
 * 取り込んだプロジェクトで現在のプロジェクトを置き換える (docs/UI_SPEC.md#ツールバー の「取込」)。
 * id は現在のものを保ち (`replaceProjectContent`)、履歴に 1 段積むので Undo で元に戻せる。
 */
export function importProject(imported: ProjectModel): void {
  const projectStore = useProjectStore.getState();
  projectStore.replaceProject(replaceProjectContent(projectStore.project, imported));
  useEditorStore.getState().clearSelection();
  fitAll();
}
