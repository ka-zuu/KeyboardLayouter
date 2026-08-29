/**
 * アプリ全体で共有する唯一のストアインスタンス。
 *
 * `projectStore.ts` / `editorStore.ts` はテストで独立したインスタンスを
 * 作れるようにファクトリ (`createProjectStore` / `createEditorStore`) として
 * 公開している。実行時のアプリはここで作った 1 組だけを使う。
 *
 * 初期状態は空のプロジェクト。実際の内容は `ui/hooks/useBootstrap.ts` が
 * マウント後に IndexedDB / 旧データから読み込んで `loadProject()` で差し替える。
 */
import { createProject } from '@/core/model/project';
import { createEditorStore } from './editorStore';
import { createProjectStore } from './projectStore';

export const useProjectStore = createProjectStore(createProject());
export const useEditorStore = createEditorStore();
