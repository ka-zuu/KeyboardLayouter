import { useFeedbackStore } from '@/state/appState';
import { deleteProjectById } from '@/state/projectActions';

/** プロジェクト一覧セクションの id。ツールバーの「プロジェクト一覧を開く」がここへスクロールする。 */
export const PROJECT_LIST_SECTION_ID = 'kl-project-list';

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
