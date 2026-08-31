/**
 * プロジェクトストア。docs/ARCHITECTURE.md#状態管理と履歴 の
 * 「編集操作は core/commands/ の純関数として書き、ストアはそれを適用するだけ」を実装する。
 *
 * 履歴 (`state/history.ts`) にはプロジェクトのスナップショットのみを積む。
 * 選択・ズーム・パンはここには置かない (editorStore.ts)。
 */
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { addKeys as addKeysCmd, type AddKeysOptions } from '@/core/commands/addKeys';
import { alignKeys as alignKeysCmd, type AlignEdge } from '@/core/commands/alignKeys';
import { deleteKeys as deleteKeysCmd } from '@/core/commands/deleteKeys';
import { distributeKeys as distributeKeysCmd, type DistributeAxis } from '@/core/commands/distributeKeys';
import { duplicateKeys as duplicateKeysCmd } from '@/core/commands/duplicateKeys';
import { moveKeys as moveKeysCmd } from '@/core/commands/moveKeys';
import { rotateKeys as rotateKeysCmd, type RotateKeysOptions } from '@/core/commands/rotateKeys';
import { setMatrix as setMatrixCmd } from '@/core/commands/setMatrix';
import { updateKeyProps as updateKeyPropsCmd } from '@/core/commands/updateKeyProps';
import { updateProjectMeta as updateProjectMetaCmd, type UpdateProjectMetaPatch } from '@/core/commands/updateProjectMeta';
import { autoAssignMatrix as autoAssignMatrixCmd, type AutoAssignOptions } from '@/core/matrix/autoAssign';
import { defaultDeps, type ModelDeps } from '@/core/model/deps';
import type { KeyModel, MatrixAddress, PointU, ProjectModel } from '@/core/model/types';
import { createHistory, type History } from './history';

export interface ProjectStoreState {
  project: ProjectModel;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;

  /** プロジェクトを丸ごと差し替える (読み込み・インポート・切替)。履歴はリセットする。 */
  loadProject(project: ProjectModel): void;

  addKeys(partials: readonly Partial<KeyModel>[], options?: AddKeysOptions): void;
  moveKeys(ids: readonly string[], deltaU: PointU, coalesceKey?: string | null): void;
  duplicateKeys(ids: readonly string[], offsetU: PointU): void;
  deleteKeys(ids: readonly string[]): void;
  rotateKeys(ids: readonly string[], deltaAngleDeg: number, options?: RotateKeysOptions, coalesceKey?: string | null): void;
  alignKeys(ids: readonly string[], edge: AlignEdge): void;
  distributeKeys(ids: readonly string[], axis: DistributeAxis): void;
  setMatrix(id: string, matrix: MatrixAddress | null): void;
  updateKeyProps(ids: readonly string[], patch: Partial<KeyModel>, coalesceKey?: string | null): void;
  updateProjectMeta(patch: UpdateProjectMetaPatch, coalesceKey?: string | null): void;
  autoAssignMatrix(targetIds: readonly string[] | null, options: AutoAssignOptions): void;

  undo(): void;
  redo(): void;
}

export type ProjectStore = UseBoundStore<StoreApi<ProjectStoreState>>;

/** UI に出す操作名。docs/ARCHITECTURE.md#状態管理と履歴 の例 ('キーの移動を取り消す') に合わせる。 */
const LABELS = {
  addKeys: 'キーの追加',
  moveKeys: 'キーの移動',
  duplicateKeys: 'キーの複製',
  deleteKeys: 'キーの削除',
  rotateKeys: 'キーの回転',
  alignKeys: '整列',
  distributeKeys: '分布',
  setMatrix: 'マトリクスの設定',
  updateKeyProps: 'プロパティの変更',
  updateProjectMeta: 'プロジェクト設定の変更',
  autoAssignMatrix: 'マトリクスの自動割り当て',
} as const;

/**
 * ストアを作成する。`deps` はテストで固定 id / 固定時刻を注入するために公開している
 * (`core/model/deps.ts` と同じパターン)。
 */
export function createProjectStore(initial: ProjectModel, deps: ModelDeps = defaultDeps): ProjectStore {
  let history: History = createHistory(initial);

  return create<ProjectStoreState>((set, get) => {
    function historyFields() {
      return {
        canUndo: history.canUndo,
        canRedo: history.canRedo,
        undoLabel: history.undoLabel,
        redoLabel: history.redoLabel,
      };
    }

    /** command を適用し、結果が変わっていれば履歴に積んで state を更新する。 */
    function apply(label: string, coalesceKey: string | null, command: (project: ProjectModel) => ProjectModel): void {
      const current = get().project;
      const next = command(current);
      if (next === current) return;

      history.push({ project: next, label, coalesceKey });
      set({ project: next, ...historyFields() });
    }

    return {
      project: initial,
      ...historyFields(),

      loadProject(project: ProjectModel): void {
        history = createHistory(project);
        set({ project, ...historyFields() });
      },

      addKeys(partials, options = {}): void {
        apply(LABELS.addKeys, null, (p) => addKeysCmd(p, partials, options, deps));
      },
      moveKeys(ids, deltaU, coalesceKey = null): void {
        apply(LABELS.moveKeys, coalesceKey, (p) => moveKeysCmd(p, ids, deltaU));
      },
      duplicateKeys(ids, offsetU): void {
        apply(LABELS.duplicateKeys, null, (p) => duplicateKeysCmd(p, ids, offsetU, deps));
      },
      deleteKeys(ids): void {
        apply(LABELS.deleteKeys, null, (p) => deleteKeysCmd(p, ids));
      },
      rotateKeys(ids, deltaAngleDeg, options = {}, coalesceKey = null): void {
        apply(LABELS.rotateKeys, coalesceKey, (p) => rotateKeysCmd(p, ids, deltaAngleDeg, options));
      },
      alignKeys(ids, edge): void {
        apply(LABELS.alignKeys, null, (p) => alignKeysCmd(p, ids, edge));
      },
      distributeKeys(ids, axis): void {
        apply(LABELS.distributeKeys, null, (p) => distributeKeysCmd(p, ids, axis));
      },
      setMatrix(id, matrix): void {
        apply(LABELS.setMatrix, null, (p) => setMatrixCmd(p, id, matrix));
      },
      updateKeyProps(ids, patch, coalesceKey = null): void {
        apply(LABELS.updateKeyProps, coalesceKey, (p) => updateKeyPropsCmd(p, ids, patch));
      },
      updateProjectMeta(patch, coalesceKey = null): void {
        apply(LABELS.updateProjectMeta, coalesceKey, (p) => updateProjectMetaCmd(p, patch, deps));
      },
      autoAssignMatrix(targetIds, options): void {
        apply(LABELS.autoAssignMatrix, null, (p) => autoAssignMatrixCmd(p, targetIds, options));
      },

      undo(): void {
        const entry = history.undo();
        if (!entry) return;
        set({ project: entry.project, ...historyFields() });
      },
      redo(): void {
        const entry = history.redo();
        if (!entry) return;
        set({ project: entry.project, ...historyFields() });
      },
    };
  });
}
