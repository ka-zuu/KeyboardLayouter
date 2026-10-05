/**
 * 取込ファイルの形式判別。docs/formats/README.md#入力の判別 の表と 1 対 1。
 * 拡張子は判断材料にしない (`.json` ばかりで区別できないため)。
 */

export type ImportFormat = 'project' | 'legacy-mkd' | 'kle' | 'kle-kbd' | 'unknown';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 配列で、要素が配列または (先頭のみ) オブジェクト。 */
function isKleRaw(value: unknown[]): boolean {
  return value.every((row, i) => Array.isArray(row) || (i === 0 && isPlainObject(row)));
}

/** JSON.parse 済みの値から形式を判別する。 */
export function detectFormat(raw: unknown): ImportFormat {
  if (Array.isArray(raw)) {
    return raw.length > 0 && isKleRaw(raw) ? 'kle' : 'unknown';
  }
  if (!isPlainObject(raw)) return 'unknown';
  if ('schemaVersion' in raw) return 'project';
  if (Array.isArray(raw.keys)) return 'legacy-mkd';
  if ('layouts' in raw) return 'kle-kbd';
  return 'unknown';
}
