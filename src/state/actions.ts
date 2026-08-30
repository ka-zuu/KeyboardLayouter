/**
 * 複数のフック (グローバルショートカット・キャンバス操作) から共有する、
 * ストアをまたぐ小さな複合アクション。単なる 1 アクションの呼び出しに
 * 収まらないもの (id の差分計算を伴う複製など) をここに置く。
 */
import type { PointU } from '@/core/model/types';
import { useEditorStore, useProjectStore } from './appState';

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
