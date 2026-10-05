/**
 * 書出の処理 (ツールバーの [書出▾] とコマンドパレットで共用)。docs/UI_SPEC.md#ツールバー。
 */
import { serializeProject } from '@/io/project/serialize';
import type { SerializeResult } from '@/io/types';
import { downloadFile } from '@/platform/download';
import { useFeedbackStore, useProjectStore } from '@/state/appState';

function download(result: SerializeResult, mimeType: string): void {
  for (const file of result.files) downloadFile(file.name, file.content, mimeType);
  if (result.warnings.length > 0) {
    useFeedbackStore.getState().pushToast({
      kind: 'warning',
      message: `書き出しで ${result.warnings.length.toString()} 件の情報が失われました。`,
      details: result.warnings.map((w) => w.message),
    });
  }
}

export function exportProjectJson(): void {
  download(serializeProject(useProjectStore.getState().project), 'application/json');
}

/** 未実装の形式。無効表示にして、対応予定のマイルストーンをツールチップに出す (docs/ROADMAP.md)。 */
export const UNSUPPORTED_EXPORTS: readonly { id: string; label: string; milestone: string }[] = [
  { id: 'kle', label: 'KLE raw JSON', milestone: 'M3' },
  { id: 'qmk-info', label: 'QMK info.json', milestone: 'M4' },
  { id: 'qmk-keymap', label: 'QMK keymap 雛形', milestone: 'M4' },
  { id: 'kicad', label: 'KiCad zip', milestone: 'M5' },
  { id: 'via', label: 'VIA 定義', milestone: 'M6' },
  { id: 'ergogen', label: 'Ergogen YAML', milestone: 'M6' },
];
