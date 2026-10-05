import { useRef } from 'react';
import { ImportError, parseImportText } from '@/io/import';
import { importProject } from '@/state/actions';
import { useFeedbackStore, useProjectStore } from '@/state/appState';

async function importFile(file: File): Promise<void> {
  const feedback = useFeedbackStore.getState();

  let result;
  try {
    result = parseImportText(await file.text());
  } catch (e) {
    if (e instanceof ImportError) {
      feedback.pushToast({ kind: 'error', message: `「${file.name}」を取り込めませんでした。${e.message}`, details: e.details });
      return;
    }
    feedback.pushToast({ kind: 'error', message: `「${file.name}」の取込中にエラーが発生しました: ${(e as Error).message}` });
    return;
  }

  const current = useProjectStore.getState().project;
  // 空のプロジェクトは失うものが無いので確認を省く。
  if (current.keys.length > 0) {
    const ok = await feedback.requestConfirm({
      title: 'プロジェクトの置き換え',
      message: `現在のプロジェクト「${current.name}」を「${result.project.name}」の内容で置き換えますか？ (Ctrl+Z で元に戻せます)`,
      confirmLabel: '置き換える',
    });
    if (!ok) return;
  }

  importProject(result.project);
  feedback.pushToast({ kind: 'success', message: `「${file.name}」を取り込みました (キー ${result.project.keys.length.toString()} 個)` });
  if (result.warnings.length > 0) {
    feedback.pushToast({
      kind: 'warning',
      message: `取込時に ${result.warnings.length.toString()} 件の変換・補正を行いました。`,
      details: result.warnings.map((w) => w.message),
    });
  }
}

/**
 * ツールバーの [取込]。ファイルを選ばせ、内容で形式を判別して現在のプロジェクトを置き換える
 * (docs/UI_SPEC.md#ツールバー、docs/formats/README.md#入力の判別)。
 */
function ImportButton() {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button type="button" className="kl-toolbar-button" data-testid="import-button" title="ファイルを取り込む" onClick={() => inputRef.current?.click()}>
        取込
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="kl-visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="import-file-input"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          // 同じファイルをもう一度選んでも change が発火するようにリセットする。
          e.currentTarget.value = '';
          if (file) void importFile(file);
        }}
      />
    </>
  );
}

export default ImportButton;
