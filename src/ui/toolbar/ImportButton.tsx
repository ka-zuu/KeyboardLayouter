import { useRef } from 'react';
import { IMPORT_FILE_INPUT_ID, importFile } from './importActions';

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
        id={IMPORT_FILE_INPUT_ID}
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
