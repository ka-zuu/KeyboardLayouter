/**
 * プロジェクト JSON (現行 / 旧 MKD) の読み込み。
 * docs/formats/PROJECT_JSON.md#検証 / docs/MIGRATION_FROM_MKD.md と 1 対 1。
 *
 * 手順: 形式判別 → migrate (旧 MKD なら v1 へ変換) → validateProject →
 * repairProject。検証でエラー (severity: 'error') が残る場合は読み込みを
 * 中止する (formats/README.md「警告を黙って捨てないこと」)。
 */
import { defaultDeps, type ModelDeps } from '@/core/model/deps';
import { migrate } from '@/core/model/migrate';
import { repairProject, validateProject, type ValidationIssue } from '@/core/model/validate';
import type { ProjectModel } from '@/core/model/types';
import type { FormatWarning, ParseResult } from '../types';

export class ProjectFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectFormatError';
  }
}

export class ProjectValidationError extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super(issues.map((i) => `${i.path}: ${i.message}`).join('\n'));
    this.name = 'ProjectValidationError';
  }
}

function isProjectShaped(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw) && Array.isArray((raw as Record<string, unknown>).keys);
}

function parseJsonText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new ProjectFormatError(`JSON として解釈できませんでした: ${(e as Error).message}`);
  }
}

/**
 * プロジェクト JSON (文字列、または JSON.parse 済みの値) を読み込む。
 * `schemaVersion` の有無で現行形式 / 旧 MKD 形式を判別する
 * (docs/formats/README.md#入力の判別)。
 */
export function parseProject(input: string | unknown, deps: ModelDeps = defaultDeps): ParseResult {
  const raw = typeof input === 'string' ? parseJsonText(input) : input;

  if (!isProjectShaped(raw)) {
    throw new ProjectFormatError("プロジェクト JSON として認識できませんでした ('keys' 配列がありません)。");
  }

  const { project: migrated, warnings: migrationWarnings } = migrate(raw, deps);

  const issues = validateProject(migrated);
  const errors = issues.filter((i) => i.severity === 'error');
  if (errors.length > 0) {
    throw new ProjectValidationError(errors);
  }

  const { project: repaired, warnings: repairWarnings } = repairProject(migrated as ProjectModel, deps);

  const warnings: FormatWarning[] = [
    ...migrationWarnings.map((w) => ({ code: w.code, message: w.message, keyId: w.keyId })),
    // repairProject の warning はキーに紐づくが、path から id を安全に
    // 逆引きできないため keyId は null にする (メッセージ文中には含む)。
    ...repairWarnings.map((w) => ({ code: 'repaired', message: w.message, keyId: null })),
  ];

  return { project: repaired, warnings };
}
