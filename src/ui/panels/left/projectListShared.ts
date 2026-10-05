import { useEditorStore, useFeedbackStore } from '@/state/appState';
import { deleteProjectById } from '@/state/projectActions';

/** プロジェクト一覧セクションの id。ツールバーの「プロジェクト一覧を開く」がここへスクロールする。 */
export const PROJECT_LIST_SECTION_ID = 'kl-project-list';

/** プロジェクト一覧へスクロールしてフォーカスする。左パネルが折りたたまれていれば先に開く。 */
export function openProjectList(): void {
  function reveal(): void {
    const section = document.getElementById(PROJECT_LIST_SECTION_ID);
    section?.scrollIntoView({ block: 'nearest' });
    section?.focus();
  }
  const editor = useEditorStore.getState();
  if (!editor.leftPanelCollapsed) {
    reveal();
    return;
  }
  editor.setLeftPanelCollapsed(false);
  // 再描画で一覧が DOM に現れてから動かす。
  requestAnimationFrame(reveal);
}

/** 確認ダイアログを出してからプロジェクトを削除する (一覧とツールバーのメニューで共用)。 */
export async function confirmDeleteProject(id: string, name: string): Promise<void> {
  const ok = await useFeedbackStore.getState().requestConfirm({
    title: 'プロジェクトの削除',
    message: `プロジェクト「${name}」を削除しますか？この操作は元に戻せません。`,
    confirmLabel: '削除',
    danger: true,
  });
  if (ok) deleteProjectById(id);
}
