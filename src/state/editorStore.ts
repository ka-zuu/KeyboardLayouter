/**
 * 編集ストア。docs/ARCHITECTURE.md#状態管理と履歴 の「編集ストア」
 * (選択、ズーム、パン、グリッド、スナップ、アクティブツール、クリップボード) を実装する。
 *
 * `core/model/types.ts` の `EditorState` フィールドはそのまま持ち、
 * それ以外の UI 専用フィールド (テーマ・マトリクス番号表示・パネル折りたたみ) は
 * ここで追加する。`core/model/types.ts` 自体は変更しない
 * (docs/DATA_MODEL.md と 1 対 1 に保つ制約があるため)。
 *
 * 選択状態は必ずこちらに置き、プロジェクト側 (`ProjectModel` / `KeyModel`) には
 * 混入させない (`KeyData.isSelected` の再来を避ける。docs/FEATURE_PARITY.md
 * の「廃止するもの」)。
 */
import { create } from 'zustand';
import { clampScale } from '@/core/geometry/viewport';
import type { ActiveTool, KeyModel, PointU } from '@/core/model/types';
import { DEFAULT_EDITOR_PREFS, type ThemePreference } from '@/platform/storage/appStorage';

export interface EditorStoreState {
  // core/model/types.ts の EditorState と同じフィールド。
  selectedKeyIds: string[];
  scale: number;
  panPx: PointU;
  gridSize: number;
  snapEnabled: boolean;
  activeTool: ActiveTool;
  clipboard: KeyModel[];

  // UI 専用フィールド (永続化するもの・しないものが混在する)。
  /** マトリクス番号の重ね表示 (`Cmd/Ctrl+M`)。 */
  showMatrix: boolean;
  theme: ThemePreference;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  /**
   * `Space` 押下中フラグ。`useViewport` (一時パン) と `useGlobalShortcuts`
   * (Space の keydown/keyup 監視元) の両方が読むため、どちらか一方の
   * クロージャに閉じずここに置く。
   */
  spacePressed: boolean;
  /** キャンバスの実ピクセルサイズ。「全体を表示」「選択にズーム」が使う。 */
  viewportPx: { width: number; height: number };

  // 選択
  selectKey(id: string, multi: boolean): void;
  selectKeys(ids: readonly string[]): void;
  clearSelection(): void;

  // ビューポート
  setScale(scale: number): void;
  setPan(panPx: PointU): void;
  setViewport(scale: number, panPx: PointU): void;

  // グリッド・スナップ
  setGridSize(gridSize: number): void;
  setSnapEnabled(enabled: boolean): void;
  toggleSnap(): void;

  // ツール
  setActiveTool(tool: ActiveTool): void;

  // クリップボード
  setClipboard(keys: readonly KeyModel[]): void;

  // UI 専用
  toggleShowMatrix(): void;
  setTheme(theme: ThemePreference): void;
  toggleLeftPanel(): void;
  toggleRightPanel(): void;
  setSpacePressed(pressed: boolean): void;
  setViewportPx(size: { width: number; height: number }): void;
}

export const INITIAL_VIEWPORT = { scale: 1, panPx: { x: 0, y: 0 } as PointU };

export function createEditorStore() {
  return create<EditorStoreState>((set, get) => ({
    selectedKeyIds: [],
    scale: INITIAL_VIEWPORT.scale,
    panPx: INITIAL_VIEWPORT.panPx,
    gridSize: DEFAULT_EDITOR_PREFS.gridSize,
    snapEnabled: DEFAULT_EDITOR_PREFS.snapEnabled,
    activeTool: 'select',
    clipboard: [],

    showMatrix: false,
    theme: DEFAULT_EDITOR_PREFS.theme,
    leftPanelCollapsed: false,
    rightPanelCollapsed: false,
    spacePressed: false,
    viewportPx: { width: 0, height: 0 },

    selectKey(id, multi): void {
      const { selectedKeyIds } = get();
      if (!multi) {
        set({ selectedKeyIds: [id] });
        return;
      }
      if (selectedKeyIds.includes(id)) {
        set({ selectedKeyIds: selectedKeyIds.filter((existing) => existing !== id) });
      } else {
        set({ selectedKeyIds: [...selectedKeyIds, id] });
      }
    },
    selectKeys(ids): void {
      set({ selectedKeyIds: [...ids] });
    },
    clearSelection(): void {
      if (get().selectedKeyIds.length === 0) return;
      set({ selectedKeyIds: [] });
    },

    setScale(scale): void {
      set({ scale: clampScale(scale) });
    },
    setPan(panPx): void {
      set({ panPx });
    },
    setViewport(scale, panPx): void {
      set({ scale: clampScale(scale), panPx });
    },

    setGridSize(gridSize): void {
      set({ gridSize });
    },
    setSnapEnabled(enabled): void {
      set({ snapEnabled: enabled });
    },
    toggleSnap(): void {
      set({ snapEnabled: !get().snapEnabled });
    },

    setActiveTool(tool): void {
      set({ activeTool: tool });
    },

    setClipboard(keys): void {
      set({ clipboard: [...keys] });
    },

    toggleShowMatrix(): void {
      set({ showMatrix: !get().showMatrix });
    },
    setTheme(theme): void {
      set({ theme });
    },
    toggleLeftPanel(): void {
      set({ leftPanelCollapsed: !get().leftPanelCollapsed });
    },
    toggleRightPanel(): void {
      set({ rightPanelCollapsed: !get().rightPanelCollapsed });
    },
    setSpacePressed(pressed): void {
      if (get().spacePressed === pressed) return;
      set({ spacePressed: pressed });
    },
    setViewportPx(size): void {
      set({ viewportPx: size });
    },
  }));
}

export type EditorStore = ReturnType<typeof createEditorStore>;
