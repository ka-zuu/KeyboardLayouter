/**
 * 取込の入口。ファイルの中身 (文字列) を受け取り、形式を判別して対応するパーサに渡す。
 * docs/formats/README.md#入力の判別。
 *
 * 失敗はすべて `ImportError` に揃え、UI はその `message` / `details` をそのままトーストに出す
 * (旧アプリの `alert('Failed to parse JSON')` のような理由の無いエラーにしない)。
 */
import { defaultDeps, type ModelDeps } from '@/core/model/deps';
import { detectFormat } from './detect';
import { parseProject, ProjectFormatError, ProjectValidationError } from './project/parse';
import type { ParseResult } from './types';

/** 取込で受け付ける形式 (エラーメッセージで示す)。M3 で KLE raw JSON を加える。 */
export const SUPPORTED_IMPORT_FORMATS = ['プロジェクト JSON', '旧バージョン (MKD) のプロジェクト JSON'] as const;

export class ImportError extends Error {
  constructor(
    message: string,
    /** 原因の詳細 (検証エラーの一覧など)。 */
    public readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'ImportError';
  }
}

const SUPPORTED_LIST = `対応形式: ${SUPPORTED_IMPORT_FORMATS.join(' / ')}`;

export function parseImportText(text: string, deps: ModelDeps = defaultDeps): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new ImportError(`JSON として解釈できませんでした: ${(e as Error).message}`, [SUPPORTED_LIST]);
  }

  const format = detectFormat(raw);
  switch (format) {
    case 'project':
    case 'legacy-mkd':
      try {
        return parseProject(raw, deps);
      } catch (e) {
        if (e instanceof ProjectValidationError) {
          throw new ImportError(
            'プロジェクト JSON の検証に失敗しました。',
            e.issues.map((i) => `${i.path}: ${i.message}`),
          );
        }
        if (e instanceof ProjectFormatError) throw new ImportError(e.message, [SUPPORTED_LIST]);
        throw e;
      }
    case 'kle':
    case 'kle-kbd':
      throw new ImportError('KLE 形式の取込にはまだ対応していません (M3 で対応予定)。', [SUPPORTED_LIST]);
    case 'unknown':
      throw new ImportError('ファイルの形式を判別できませんでした。', [SUPPORTED_LIST]);
  }
}
