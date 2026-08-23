/**
 * すべての形式変換に共通するインタフェース。
 * docs/formats/README.md#変換の構造 と 1 対 1。
 */
import type { ProjectModel } from '@/core/model/types';

export interface FormatWarning {
  /** 'unsupported-property' | 'missing-matrix' | 'lossy-conversion' など。 */
  code: string;
  message: string;
  /** 該当キーの id (キーに紐づかない警告では null)。 */
  keyId: string | null;
}

export interface ParseResult {
  project: ProjectModel;
  /** 変換で落ちた情報・推測した箇所。UI でユーザーに見せる。 */
  warnings: FormatWarning[];
}

export interface SerializeResult {
  /** ファイル名 → 内容。zip 出力では複数のエントリを返す。 */
  files: { name: string; content: string | Uint8Array }[];
  warnings: FormatWarning[];
}
