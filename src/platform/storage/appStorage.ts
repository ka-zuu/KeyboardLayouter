/**
 * アプリの永続化。docs/adr/0004-storage.md#決定 の 3 キー構成をそのまま実装する。
 *
 * | キー | 内容 |
 * |---|---|
 * | `projects` | `Record<string, ProjectModel>` |
 * | `currentProjectId` | `string` |
 * | `editorPrefs` | `{ gridSize, snapEnabled, theme }` |
 *
 * 書き込みは 1000ms デバウンスし、連続更新中は最後の状態だけを書く。
 * `primary` (通常は IndexedDB) への書き込みが失敗したら `fallback`
 * (`localStorage`) へ書く。`StorageBackend` を引数で受け取るため、
 * テストはインメモリ実装で完結する。
 */
import type { ProjectModel } from '@/core/model/types';
import type { StorageBackend } from './backend';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface EditorPrefs {
  gridSize: number;
  snapEnabled: boolean;
  theme: ThemePreference;
}

export const DEFAULT_EDITOR_PREFS: EditorPrefs = {
  gridSize: 0.25,
  snapEnabled: true,
  theme: 'system',
};

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

const KEY_PROJECTS = 'projects';
const KEY_CURRENT_PROJECT_ID = 'currentProjectId';
const KEY_EDITOR_PREFS = 'editorPrefs';

const DEFAULT_DEBOUNCE_MS = 1000;

export interface AppStorageOptions {
  primary: StorageBackend;
  fallback: StorageBackend;
  debounceMs?: number;
  onStatusChange?: (status: SaveStatus) => void;
}

export interface AppStorage {
  loadProjects(): Promise<Record<string, ProjectModel> | undefined>;
  loadCurrentProjectId(): Promise<string | undefined>;
  loadEditorPrefs(): Promise<EditorPrefs | undefined>;
  /** デバウンスして書き込む (fire-and-forget)。 */
  saveProjects(projects: Record<string, ProjectModel>): void;
  saveCurrentProjectId(id: string): void;
  saveEditorPrefs(prefs: EditorPrefs): void;
  /** デバウンス中の書き込みをすべて即座に反映する (テスト・ページ離脱時用)。 */
  flush(): Promise<void>;
}

export function createAppStorage(options: AppStorageOptions): AppStorage {
  const { primary, fallback, onStatusChange } = options;
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const pending = new Map<string, unknown>();
  const inFlight: Promise<void>[] = [];

  async function writeNow(key: string, value: unknown): Promise<void> {
    onStatusChange?.('saving');
    try {
      await primary.set(key, value);
      onStatusChange?.('saved');
    } catch {
      try {
        await fallback.set(key, value);
        onStatusChange?.('saved');
      } catch {
        onStatusChange?.('failed');
      }
    }
  }

  function scheduleWrite(key: string, value: unknown): void {
    pending.set(key, value);
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      timers.delete(key);
      const v = pending.get(key);
      pending.delete(key);
      const task = writeNow(key, v);
      inFlight.push(task);
      void task.finally(() => {
        const idx = inFlight.indexOf(task);
        if (idx !== -1) inFlight.splice(idx, 1);
      });
    }, debounceMs);
    timers.set(key, timer);
  }

  async function load<T>(key: string): Promise<T | undefined> {
    const fromPrimary = await primary.get<T>(key);
    if (fromPrimary !== undefined) return fromPrimary;
    return fallback.get<T>(key);
  }

  return {
    loadProjects: () => load<Record<string, ProjectModel>>(KEY_PROJECTS),
    loadCurrentProjectId: () => load<string>(KEY_CURRENT_PROJECT_ID),
    loadEditorPrefs: () => load<EditorPrefs>(KEY_EDITOR_PREFS),
    saveProjects: (projects) => scheduleWrite(KEY_PROJECTS, projects),
    saveCurrentProjectId: (id) => scheduleWrite(KEY_CURRENT_PROJECT_ID, id),
    saveEditorPrefs: (prefs) => scheduleWrite(KEY_EDITOR_PREFS, prefs),
    flush: async () => {
      for (const [key, timer] of timers) {
        clearTimeout(timer);
        timers.delete(key);
        const v = pending.get(key);
        pending.delete(key);
        inFlight.push(writeNow(key, v));
      }
      await Promise.all(inFlight);
    },
  };
}
