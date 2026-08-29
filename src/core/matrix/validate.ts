/**
 * 電気マトリクスの検証。docs/MATRIX.md#手動での確認 の表と 1 対 1。
 */
import type { ProjectModel } from '@/core/model/types';

export type MatrixIssueCode = 'duplicate' | 'unassigned' | 'row-gap' | 'col-gap';

export interface MatrixIssue {
  code: MatrixIssueCode;
  message: string;
  /** 該当するキーの id。gap 系の issue では空配列。 */
  keyIds: string[];
}

export interface MatrixReport {
  issues: MatrixIssue[];
  /** 使用中の最大 Row + 1。未使用なら 0。 */
  estimatedRows: number;
  /** 使用中の最大 Col + 1。未使用なら 0。 */
  estimatedCols: number;
}

function findGaps(values: ReadonlySet<number>): number[] {
  if (values.size === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  const gaps: number[] = [];
  for (let i = min; i <= max; i++) {
    if (!values.has(i)) gaps.push(i);
  }
  return gaps;
}

/** decal を除くキーを対象に、重複・未割り当て・欠番・推定サイズを調べる。 */
export function validateMatrix(project: ProjectModel): MatrixReport {
  const relevant = project.keys.filter((k) => !k.decal);
  const issues: MatrixIssue[] = [];

  const byAddress = new Map<string, string[]>();
  const rows = new Set<number>();
  const cols = new Set<number>();
  for (const key of relevant) {
    if (!key.matrix) continue;
    rows.add(key.matrix.row);
    cols.add(key.matrix.col);
    const addressKey = `${key.matrix.row},${key.matrix.col}`;
    const ids = byAddress.get(addressKey);
    if (ids) ids.push(key.id);
    else byAddress.set(addressKey, [key.id]);
  }

  for (const [address, ids] of byAddress) {
    if (ids.length > 1) {
      issues.push({
        code: 'duplicate',
        message: `(${address}) が ${ids.length} 件のキーで重複しています。`,
        keyIds: ids,
      });
    }
  }

  const unassigned = relevant.filter((k) => k.matrix === null).map((k) => k.id);
  if (unassigned.length > 0) {
    issues.push({
      code: 'unassigned',
      message: `${unassigned.length} 件のキーにマトリクスが割り当てられていません。`,
      keyIds: unassigned,
    });
  }

  const rowGaps = findGaps(rows);
  if (rowGaps.length > 0) {
    issues.push({ code: 'row-gap', message: `Row に欠番があります (${rowGaps.join(', ')})。`, keyIds: [] });
  }
  const colGaps = findGaps(cols);
  if (colGaps.length > 0) {
    issues.push({ code: 'col-gap', message: `Col に欠番があります (${colGaps.join(', ')})。`, keyIds: [] });
  }

  return {
    issues,
    estimatedRows: rows.size > 0 ? Math.max(...rows) + 1 : 0,
    estimatedCols: cols.size > 0 ? Math.max(...cols) + 1 : 0,
  };
}
