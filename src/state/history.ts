/**
 * Undo / Redo の履歴。docs/adr/0003-state-and-history.md の案 C
 * (自前のスナップショット履歴 + 操作ラベル) をそのまま実装する。
 *
 * 「操作後のプロジェクト全体」と「操作名」を組で積む。逆操作を書く必要が無く、
 * スナップショットを差し替えるだけで Undo / Redo が実現できる。
 */
import type { ProjectModel } from '@/core/model/types';

/** 履歴の上限段数 (旧アプリと同じ)。 */
export const HISTORY_LIMIT = 50;

export interface HistoryEntry {
  project: ProjectModel;
  /** UI に出す操作名 (例: 'キーの移動')。 */
  label: string;
  /** 同じ id の連続した操作は 1 段にまとめる (ドラッグ中の更新など)。 */
  coalesceKey: string | null;
}

export interface History {
  /** entry を積む。直前の entry と同じ非 null な coalesceKey なら 1 段にまとめる (差し替え)。 */
  push(entry: HistoryEntry): void;
  undo(): HistoryEntry | null;
  redo(): HistoryEntry | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /** 直近の操作名 (ツールチップ用)。 */
  readonly undoLabel: string | null;
  readonly redoLabel: string | null;
}

/**
 * 履歴を新規作成する。`initial` は最初の状態 (undo の底になる)。
 */
export function createHistory(initial: ProjectModel, limit: number = HISTORY_LIMIT): History {
  const past: HistoryEntry[] = [{ project: initial, label: '初期状態', coalesceKey: null }];
  const future: HistoryEntry[] = [];

  return {
    push(entry: HistoryEntry): void {
      future.length = 0;

      const last = past[past.length - 1];
      if (entry.coalesceKey !== null && last?.coalesceKey === entry.coalesceKey) {
        past[past.length - 1] = entry;
        return;
      }

      past.push(entry);
      if (past.length > limit + 1) {
        past.splice(0, past.length - (limit + 1));
      }
    },

    undo(): HistoryEntry | null {
      if (past.length <= 1) return null;
      const entry = past.pop()!;
      future.push(entry);
      return past[past.length - 1]!;
    },

    redo(): HistoryEntry | null {
      if (future.length === 0) return null;
      const entry = future.pop()!;
      past.push(entry);
      return entry;
    },

    get canUndo(): boolean {
      return past.length > 1;
    },
    get canRedo(): boolean {
      return future.length > 0;
    },
    get undoLabel(): string | null {
      return past.length > 1 ? past[past.length - 1]!.label : null;
    },
    get redoLabel(): string | null {
      return future.length > 0 ? future[future.length - 1]!.label : null;
    },
  };
}
