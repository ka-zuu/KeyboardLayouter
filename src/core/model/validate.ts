/**
 * 読み込んだデータの検証。docs/formats/PROJECT_JSON.md#検証 /
 * docs/DATA_MODEL.md#不変条件 と 1 対 1。信用しない前提で `unknown` を受け取る。
 */
import { defaultDeps, type ModelDeps } from './deps';
import type { KeyModel, KeyShape, ProjectModel } from './types';

export interface ValidationIssue {
  /** 'keys[3].size.w' 形式。 */
  path: string;
  message: string;
  /** 'error' は読み込み中止、'warning' は自動修復のうえ読み込みを続ける。 */
  severity: 'error' | 'warning';
}

const KNOWN_SHAPES: readonly KeyShape[] = ['rect', 'isoEnter', 'steppedCaps', 'bigAssEnter', 'custom'];

function pushError(issues: ValidationIssue[], path: string, message: string): void {
  issues.push({ path, message, severity: 'error' });
}

function pushWarning(issues: ValidationIssue[], path: string, message: string): void {
  issues.push({ path, message, severity: 'warning' });
}

/** 数値として現れるすべてのフィールドが NaN / Infinity でないかを再帰的に検査する。 */
function checkFiniteNumbers(path: string, value: unknown, issues: ValidationIssue[]): void {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      pushError(issues, path, `数値が不正です (${String(value)})。`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => checkFiniteNumbers(`${path}[${i}]`, v, issues));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      checkFiniteNumbers(path ? `${path}.${k}` : k, v, issues);
    }
  }
}

function validateKey(rawKey: unknown, index: number, seenIds: Set<string>, issues: ValidationIssue[]): void {
  const path = `keys[${index}]`;
  if (typeof rawKey !== 'object' || rawKey === null) {
    pushError(issues, path, 'キーはオブジェクトである必要があります。');
    return;
  }
  const key = rawKey as Record<string, unknown>;

  if (typeof key.id !== 'string' || key.id.length === 0) {
    pushError(issues, `${path}.id`, 'id は空でない文字列である必要があります。');
  } else if (seenIds.has(key.id)) {
    pushWarning(issues, `${path}.id`, `id が重複しています (${key.id})。新しい id を振り直します。`);
  } else {
    seenIds.add(key.id);
  }

  const size = key.size as { w?: unknown; h?: unknown } | undefined;
  if (typeof size !== 'object' || size === null || typeof size.w !== 'number' || typeof size.h !== 'number') {
    pushError(issues, `${path}.size`, 'size.w / size.h は数値である必要があります。');
  } else {
    if (!(size.w > 0)) pushError(issues, `${path}.size.w`, 'size.w は正の数である必要があります。');
    if (!(size.h > 0)) pushError(issues, `${path}.size.h`, 'size.h は正の数である必要があります。');
  }

  const shape = key.shape;
  if (typeof shape !== 'string' || !KNOWN_SHAPES.includes(shape as KeyShape)) {
    pushError(issues, `${path}.shape`, `未知の shape です (${String(shape)})。`);
  } else {
    const secondary = key.secondary;
    const polygon = key.polygon;
    if (shape === 'rect') {
      if (secondary != null || polygon != null) {
        pushWarning(issues, `${path}.shape`, "shape が 'rect' なら secondary / polygon は null である必要があります。shape を 'rect' に統一します。");
      }
    } else if (shape === 'custom') {
      if (!Array.isArray(polygon) || polygon.length < 3) {
        pushWarning(issues, `${path}.polygon`, "shape が 'custom' のときは polygon が 3 点以上必要です。'rect' に落とします。");
      }
    } else if (secondary == null) {
      pushWarning(issues, `${path}.secondary`, `shape が '${shape}' のときは secondary が必要です。'rect' に落とします。`);
    }
  }

  checkFiniteNumbers(path, key, issues);
}

/** 読み込んだ値の検証。プロジェクトの形を成しているかどうかも問わない。 */
export function validateProject(value: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (typeof value !== 'object' || value === null) {
    pushError(issues, '', 'プロジェクトはオブジェクトである必要があります。');
    return issues;
  }
  const v = value as Record<string, unknown>;

  if (typeof v.schemaVersion !== 'number') pushError(issues, 'schemaVersion', 'schemaVersion は数値である必要があります。');
  if (typeof v.id !== 'string') pushError(issues, 'id', 'id は文字列である必要があります。');
  if (typeof v.name !== 'string') pushError(issues, 'name', 'name は文字列である必要があります。');
  if (typeof v.createdAt !== 'number') pushError(issues, 'createdAt', 'createdAt は数値である必要があります。');
  if (typeof v.updatedAt !== 'number') pushError(issues, 'updatedAt', 'updatedAt は数値である必要があります。');
  if (typeof v.meta !== 'object' || v.meta === null) pushError(issues, 'meta', 'meta が必要です。');
  if (!Array.isArray(v.keys)) {
    pushError(issues, 'keys', 'keys は配列である必要があります。');
    return issues;
  }

  const seenIds = new Set<string>();
  v.keys.forEach((rawKey, i) => validateKey(rawKey, i, seenIds, issues));

  return issues;
}

export interface RepairResult {
  project: ProjectModel;
  warnings: ValidationIssue[];
}

/**
 * `validateProject` が返した warning 相当の不整合を自動修復する。
 * `severity: 'error'` の issue が残っている入力を渡さないこと (呼び出し側で
 * 読み込みを中止する)。
 */
export function repairProject(project: ProjectModel, deps: ModelDeps = defaultDeps): RepairResult {
  const warnings: ValidationIssue[] = [];
  const seenIds = new Set<string>();

  const keys: KeyModel[] = project.keys.map((key, i) => {
    let repaired = key;

    if (seenIds.has(repaired.id)) {
      const newId = deps.newId();
      pushWarning(warnings, `keys[${i}].id`, `id が重複していたため新しい id (${newId}) を振りました。`);
      repaired = { ...repaired, id: newId };
    }
    seenIds.add(repaired.id);

    const needsSecondary = repaired.shape !== 'rect' && repaired.shape !== 'custom';
    const invalidRect = repaired.shape === 'rect' && (repaired.secondary !== null || repaired.polygon !== null);
    const invalidCustom = repaired.shape === 'custom' && (!repaired.polygon || repaired.polygon.length < 3);
    const missingSecondary = needsSecondary && repaired.secondary === null;

    if (invalidRect || invalidCustom || missingSecondary) {
      pushWarning(warnings, `keys[${i}].shape`, `shape '${repaired.shape}' の形状情報が不整合だったため 'rect' に統一しました。`);
      repaired = { ...repaired, shape: 'rect', secondary: null, polygon: null };
    }

    return repaired;
  });

  return { project: { ...project, keys }, warnings };
}
