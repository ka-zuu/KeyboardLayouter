/**
 * 複数のフック (グローバルショートカット・キャンバス操作) から共有する、
 * ストアをまたぐ小さな複合アクション。単なる 1 アクションの呼び出しに
 * 収まらないもの (id の差分計算を伴う複製など) をここに置く。
 */
import type { KeyModel, MatrixAddress, PointU } from '@/core/model/types';
import { useEditorStore, useProjectStore } from './appState';

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
