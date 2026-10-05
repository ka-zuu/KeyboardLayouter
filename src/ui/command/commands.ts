/**
 * コマンドパレットに並べる操作の定義 (docs/UI_SPEC.md#コマンドパレット-cmdctrlk)。
 *
 * 「すべての操作をここから実行できる」ことが目的なので、ツールバー・インスペクタ・
 * ショートカットから行える操作はここにも足す。処理本体は `state/actions.ts` 等の
 * 既存の関数を呼ぶだけにし、ここに編集ロジックを書かない。
 *
 * `keywords` には英語名と漢字の読み (ひらがな) を書く。曖昧一致 (`fuzzy.ts`) は
 * 漢字の読みを推測しないため、「せいれつ」で「左揃え」を引けるのはこの欄のおかげ。
 */
import type { AlignEdge } from '@/core/commands/alignKeys';
import type { DistributeAxis } from '@/core/commands/distributeKeys';
import type { ActiveTool } from '@/core/model/types';
import type { ThemePreference } from '@/platform/storage/appStorage';
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
  ZOOM_STEP,
  zoomBy,
} from '@/state/actions';
import { useEditorStore, useProjectStore } from '@/state/appState';
import { createNewProject, duplicateProjectById, saveAndNotify } from '@/state/projectActions';
import { confirmDeleteProject, openProjectList } from '@/ui/panels/left/projectListShared';
import { exportProjectJson } from '@/ui/toolbar/exportActions';
import { openImportDialog } from '@/ui/toolbar/importActions';

export interface Command {
  id: string;
  /** カテゴリ (パレットで項目の右に小さく出す)。 */
  group: string;
  title: string;
  keywords: readonly string[];
  /** `shortcuts.ts` と同じ `Mod+K` 形式。 */
  shortcut?: string;
  /** 今実行できるか。省略時は常に実行できる。パレットを開いた時点の状態で評価する。 */
  enabled?(): boolean;
  run(): void;
}

const editor = () => useEditorStore.getState();
const projectStore = () => useProjectStore.getState();
const selectionCount = () => editor().selectedKeyIds.length;

const TOOL_COMMANDS: { tool: ActiveTool; title: string; keywords: string[]; shortcut: string }[] = [
  { tool: 'select', title: 'Select ツール', keywords: ['select tool', 'せんたく', 'せれくと'], shortcut: 'V' },
  { tool: 'addKey', title: 'Add Key ツール', keywords: ['add key tool', 'きーのついか', 'ついか'], shortcut: 'K' },
  { tool: 'rotate', title: 'Rotate ツール', keywords: ['rotate tool', 'かいてん', 'ろーてーと'], shortcut: 'R' },
  { tool: 'pan', title: 'Pan ツール', keywords: ['pan tool', 'hand', 'ぱん', 'いどう', 'すくろーる'], shortcut: 'H' },
];

const ALIGN_COMMANDS: { edge: AlignEdge; title: string; keywords: string[] }[] = [
  { edge: 'left', title: '左揃え', keywords: ['align left', 'せいれつ', 'ひだりぞろえ'] },
  { edge: 'centerH', title: '水平中央揃え', keywords: ['align center horizontal', 'せいれつ', 'すいへいちゅうおうぞろえ'] },
  { edge: 'right', title: '右揃え', keywords: ['align right', 'せいれつ', 'みぎぞろえ'] },
  { edge: 'top', title: '上揃え', keywords: ['align top', 'せいれつ', 'うえぞろえ'] },
  { edge: 'centerV', title: '垂直中央揃え', keywords: ['align center vertical', 'middle', 'せいれつ', 'すいちょくちゅうおうぞろえ'] },
  { edge: 'bottom', title: '下揃え', keywords: ['align bottom', 'せいれつ', 'したぞろえ'] },
];

const DISTRIBUTE_COMMANDS: { axis: DistributeAxis; title: string; keywords: string[] }[] = [
  { axis: 'horizontal', title: '水平方向に等間隔に分布', keywords: ['distribute horizontal', 'ぶんぷ', 'すいへい', 'とうかんかく'] },
  { axis: 'vertical', title: '垂直方向に等間隔に分布', keywords: ['distribute vertical', 'ぶんぷ', 'すいちょく', 'とうかんかく'] },
];

/** docs/GEOMETRY.md#グリッドとスナップ の選択肢 (ツールバーの Grid と同じ)。 */
const GRID_SIZES = [1, 0.5, 0.25, 0.125, 0.05];

const THEME_COMMANDS: { theme: ThemePreference; title: string; keywords: string[] }[] = [
  { theme: 'system', title: 'テーマ: システムに合わせる', keywords: ['theme system', 'auto', 'てーま', 'しすてむ'] },
  { theme: 'light', title: 'テーマ: ライト', keywords: ['theme light', 'てーま', 'らいと'] },
  { theme: 'dark', title: 'テーマ: ダーク', keywords: ['theme dark', 'てーま', 'だーく'] },
];

export function buildCommands(): Command[] {
  return [
    // 全般
    {
      id: 'help.shortcuts',
      group: 'ヘルプ',
      title: 'ショートカット一覧を表示',
      keywords: ['keyboard shortcuts', 'help', 'しょーとかっと', 'へるぷ'],
      shortcut: '?',
      run: () => editor().setOverlay('shortcutHelp'),
    },

    // ツール
    ...TOOL_COMMANDS.map(
      ({ tool, title, keywords, shortcut }): Command => ({
        id: `tool.${tool}`,
        group: 'ツール',
        title,
        keywords,
        shortcut,
        run: () => editor().setActiveTool(tool),
      }),
    ),

    // 編集
    {
      id: 'edit.undo',
      group: '編集',
      title: '取り消し',
      keywords: ['undo', 'とりけし', 'もとにもどす'],
      shortcut: 'Mod+Z',
      enabled: () => projectStore().canUndo,
      run: () => projectStore().undo(),
    },
    {
      id: 'edit.redo',
      group: '編集',
      title: 'やり直し',
      keywords: ['redo', 'やりなおし'],
      shortcut: 'Mod+Shift+Z',
      enabled: () => projectStore().canRedo,
      run: () => projectStore().redo(),
    },
    {
      id: 'edit.selectAll',
      group: '編集',
      title: 'すべて選択',
      keywords: ['select all', 'すべてせんたく'],
      shortcut: 'Mod+A',
      enabled: () => projectStore().project.keys.length > 0,
      run: selectAll,
    },
    {
      id: 'edit.clearSelection',
      group: '編集',
      title: '選択を解除',
      keywords: ['deselect', 'clear selection', 'せんたくかいじょ'],
      shortcut: 'Esc',
      enabled: () => selectionCount() > 0,
      run: () => editor().clearSelection(),
    },
    {
      id: 'edit.copy',
      group: '編集',
      title: 'コピー',
      keywords: ['copy', 'こぴー'],
      shortcut: 'Mod+C',
      enabled: () => selectionCount() > 0,
      run: copySelection,
    },
    {
      id: 'edit.paste',
      group: '編集',
      title: '貼り付け',
      keywords: ['paste', 'はりつけ', 'ぺーすと'],
      shortcut: 'Mod+V',
      enabled: () => editor().clipboard.length > 0,
      run: pasteClipboard,
    },
    {
      id: 'edit.duplicate',
      group: '編集',
      title: '複製',
      keywords: ['duplicate', 'ふくせい'],
      shortcut: 'Mod+D',
      enabled: () => selectionCount() > 0,
      run: duplicateSelection,
    },
    {
      id: 'edit.delete',
      group: '編集',
      title: '選択中のキーを削除',
      keywords: ['delete', 'remove', 'さくじょ'],
      shortcut: 'Delete',
      enabled: () => selectionCount() > 0,
      run: deleteSelection,
    },
    {
      id: 'edit.legend',
      group: '編集',
      title: '刻印を編集',
      keywords: ['edit legend', 'label', 'こくいん', 'へんしゅう'],
      shortcut: 'Enter',
      enabled: () => selectionCount() === 1,
      run: startLegendEditOfSelection,
    },

    // 整列・分布
    ...ALIGN_COMMANDS.map(
      ({ edge, title, keywords }): Command => ({
        id: `align.${edge}`,
        group: '整列',
        title,
        keywords,
        enabled: () => selectionCount() >= 2,
        run: () => projectStore().alignKeys(editor().selectedKeyIds, edge),
      }),
    ),
    ...DISTRIBUTE_COMMANDS.map(
      ({ axis, title, keywords }): Command => ({
        id: `distribute.${axis}`,
        group: '整列',
        title,
        keywords,
        enabled: () => selectionCount() >= 3,
        run: () => projectStore().distributeKeys(editor().selectedKeyIds, axis),
      }),
    ),

    // マトリクス
    {
      id: 'matrix.autoAssign',
      group: 'マトリクス',
      title: 'マトリクスを自動割り当て (Row 0 / Col 0 から)',
      keywords: ['auto assign matrix', 'まとりくす', 'じどうわりあて'],
      enabled: () => projectStore().project.keys.length > 0,
      // 選択があれば選択キーだけ、無ければ全キー (インスペクタの無選択 / 複数選択と同じ対象)。
      run: () => projectStore().autoAssignMatrix(selectionCount() > 0 ? editor().selectedKeyIds : null, { startRow: 0, startCol: 0 }),
    },
    {
      id: 'view.toggleMatrix',
      group: 'マトリクス',
      title: 'マトリクス番号の表示切り替え',
      keywords: ['toggle matrix numbers', 'まとりくすばんごう', 'ひょうじ'],
      shortcut: 'Mod+M',
      run: () => editor().toggleShowMatrix(),
    },

    // 表示
    { id: 'view.zoomIn', group: '表示', title: '拡大', keywords: ['zoom in', 'かくだい', 'ずーむ'], run: () => zoomBy(ZOOM_STEP) },
    { id: 'view.zoomOut', group: '表示', title: '縮小', keywords: ['zoom out', 'しゅくしょう', 'ずーむ'], run: () => zoomBy(1 / ZOOM_STEP) },
    { id: 'view.zoom100', group: '表示', title: 'ズーム 100%', keywords: ['zoom 100%', 'actual size', 'ずーむ'], shortcut: 'Mod+0', run: resetZoom },
    {
      id: 'view.fitAll',
      group: '表示',
      title: '全体を表示',
      keywords: ['zoom to fit', 'fit all', 'ぜんたいをひょうじ', 'ずーむ'],
      shortcut: 'Shift+1',
      enabled: () => projectStore().project.keys.length > 0,
      run: fitAll,
    },
    {
      id: 'view.fitSelection',
      group: '表示',
      title: '選択にズーム',
      keywords: ['zoom to selection', 'せんたくにずーむ'],
      shortcut: 'Shift+2',
      enabled: () => selectionCount() > 0,
      run: fitSelection,
    },
    {
      id: 'view.toggleSnap',
      group: '表示',
      title: 'スナップの有効・無効',
      keywords: ['toggle snap', 'すなっぷ'],
      shortcut: 'Mod+G',
      run: () => editor().toggleSnap(),
    },
    ...GRID_SIZES.map(
      (size): Command => ({
        id: `view.grid.${size.toString()}`,
        group: '表示',
        title: `グリッド間隔を ${size.toString()}U にする`,
        keywords: ['grid size', 'ぐりっど', 'かんかく'],
        run: () => editor().setGridSize(size),
      }),
    ),
    {
      id: 'view.toggleLeftPanel',
      group: '表示',
      title: '左パネルの折りたたみ',
      keywords: ['toggle left panel', 'sidebar', 'ひだりぱねる', 'おりたたみ'],
      shortcut: 'Mod+\\',
      run: () => editor().toggleLeftPanel(),
    },
    {
      id: 'view.toggleRightPanel',
      group: '表示',
      title: 'インスペクタの折りたたみ',
      keywords: ['toggle inspector', 'right panel', 'いんすぺくた', 'みぎぱねる', 'おりたたみ'],
      shortcut: 'Mod+Alt+\\',
      run: () => editor().toggleRightPanel(),
    },
    ...THEME_COMMANDS.map(
      ({ theme, title, keywords }): Command => ({
        id: `view.theme.${theme}`,
        group: '表示',
        title,
        keywords,
        run: () => editor().setTheme(theme),
      }),
    ),

    // プロジェクト
    {
      id: 'project.save',
      group: 'プロジェクト',
      title: 'プロジェクトを保存',
      keywords: ['save', 'ほぞん'],
      shortcut: 'Mod+S',
      run: () => void saveAndNotify(),
    },
    { id: 'project.new', group: 'プロジェクト', title: '新規プロジェクト', keywords: ['new project', 'しんき'], run: createNewProject },
    {
      id: 'project.duplicate',
      group: 'プロジェクト',
      title: 'プロジェクトを複製',
      keywords: ['duplicate project', 'ふくせい'],
      run: () => duplicateProjectById(projectStore().project.id),
    },
    {
      id: 'project.list',
      group: 'プロジェクト',
      title: 'プロジェクト一覧を開く',
      keywords: ['open project list', 'いちらん', 'ひらく'],
      run: openProjectList,
    },
    {
      id: 'project.delete',
      group: 'プロジェクト',
      title: 'プロジェクトを削除',
      keywords: ['delete project', 'さくじょ'],
      run: () => {
        const { id, name } = projectStore().project;
        void confirmDeleteProject(id, name);
      },
    },
    { id: 'project.import', group: 'プロジェクト', title: 'ファイルを取り込む', keywords: ['import', 'open file', 'とりこみ', 'よみこみ'], run: openImportDialog },
    {
      id: 'project.exportJson',
      group: 'プロジェクト',
      title: 'プロジェクト JSON を書き出す',
      keywords: ['export project json', 'download', 'かきだし', 'えくすぽーと'],
      run: exportProjectJson,
    },
  ];
}
