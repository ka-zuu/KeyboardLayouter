/**
 * schemaVersion に基づく前方移行。docs/MIGRATION_FROM_MKD.md と 1 対 1。
 *
 * 移行は読み込み時の副作用にせず、独立した純関数として提供する
 * (docs/formats/PROJECT_JSON.md#移行処理)。
 */
import { defaultDeps, type ModelDeps } from './deps';
import { defaultSecondaryFor } from './key';
import { SCHEMA_VERSION, type KeyModel, type KeyShape, type Legends, type ProjectModel } from './types';

export interface MigrationWarning {
  code: string;
  message: string;
  keyId: string | null;
}

export interface MigrateResult {
  project: ProjectModel;
  warnings: MigrationWarning[];
}

/** 現在より新しい schemaVersion のファイルを読み込もうとしたときに投げる。 */
export class UnsupportedSchemaVersionError extends Error {
  constructor(
    public readonly fileVersion: number,
    public readonly appVersion: number,
  ) {
    super(
      `このファイルは新しいバージョンのアプリで作られています (ファイル: 版 ${fileVersion} / このアプリ: 版 ${appVersion})。アプリを更新してください。`,
    );
    this.name = 'UnsupportedSchemaVersionError';
  }
}

type Migration = (raw: unknown, deps: ModelDeps, warnings: MigrationWarning[]) => unknown;

/** 版 N から N+1 への変換。添字が変換前の版に対応する。 */
const migrations: Record<number, Migration> = {
  0: migrateV0ToV1,
};

/** 任意の版のデータを現在の版まで順に変換する。 */
export function migrate(raw: unknown, deps: ModelDeps = defaultDeps): MigrateResult {
  const warnings: MigrationWarning[] = [];
  const version = detectSchemaVersion(raw);

  if (version > SCHEMA_VERSION) {
    throw new UnsupportedSchemaVersionError(version, SCHEMA_VERSION);
  }

  let current: unknown = raw;
  for (let v = version; v < SCHEMA_VERSION; v++) {
    const step = migrations[v];
    if (!step) {
      throw new Error(`版 ${v} から版 ${v + 1} への移行処理が定義されていません。`);
    }
    current = step(current, deps, warnings);
  }

  return { project: current as ProjectModel, warnings };
}

function detectSchemaVersion(raw: unknown): number {
  if (raw !== null && typeof raw === 'object' && 'schemaVersion' in raw) {
    const v = (raw as { schemaVersion: unknown }).schemaVersion;
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0) return v;
  }
  return 0;
}

// --- v0 (旧 MKD 形式) --------------------------------------------------

interface LegacyPoint {
  x: number;
  y: number;
}

interface LegacyLegends {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  // さらに古い形。
  tl?: string;
  tr?: string;
  bl?: string;
  br?: string;
}

interface LegacyKeyData {
  id?: string;
  position?: LegacyPoint;
  size?: { w: number; h: number };
  angle?: number;
  rotationCenter?: LegacyPoint;
  legends?: LegacyLegends;
  visualLegend?: string;
  matrix?: { row: number; col: number };
  variant?: 'rect' | 'iso_enter' | 'stepped_caps';
  isSelected?: boolean;
}

interface LegacyProjectData {
  id?: string;
  name?: string;
  keys?: LegacyKeyData[];
  createdAt?: number;
  updatedAt?: number;
}

const VARIANT_TO_SHAPE: Record<NonNullable<LegacyKeyData['variant']>, KeyShape> = {
  rect: 'rect',
  iso_enter: 'isoEnter',
  stepped_caps: 'steppedCaps',
};

function migrateLegends(legacy: LegacyLegends | undefined): Legends {
  if (!legacy) return {};
  const legends: Legends = {};

  // 現行 (4 面: top/bottom/left/right)
  if (legacy.top) legends.topCenter = legacy.top;
  if (legacy.bottom) legends.bottomCenter = legacy.bottom;
  if (legacy.left) legends.centerLeft = legacy.left;
  if (legacy.right) legends.centerRight = legacy.right;

  // さらに古い形 (tl/tr/bl/br)。旧実装の対応をそのまま踏襲する
  // (tl→topCenter, tr→centerRight, bl→centerLeft, br→bottomCenter で、
  // 直感的な対応とは異なる点に注意。docs/MIGRATION_FROM_MKD.md 参照)。
  if (legacy.tl) legends.topCenter = legacy.tl;
  if (legacy.tr) legends.centerRight = legacy.tr;
  if (legacy.bl) legends.centerLeft = legacy.bl;
  if (legacy.br) legends.bottomCenter = legacy.br;

  return legends;
}

function migrateKeyV0(
  legacy: LegacyKeyData,
  deps: ModelDeps,
  warnings: MigrationWarning[],
  duplicateZeroMatrixCount: { count: number },
): KeyModel {
  const id = legacy.id ?? deps.newId();
  const size = legacy.size ?? { w: 1, h: 1 };

  const rotationCenter = legacy.rotationCenter;
  if (rotationCenter && (rotationCenter.x !== 0 || rotationCenter.y !== 0)) {
    warnings.push({
      code: 'rotation-center-discarded',
      message: `キー ${id} の rotationCenter (${rotationCenter.x}, ${rotationCenter.y}) は使われていなかったため破棄しました。`,
      keyId: id,
    });
  }

  let legends = migrateLegends(legacy.legends);
  if (legacy.visualLegend) {
    legends = { ...legends, topCenter: legacy.visualLegend };
  }

  const variant = legacy.variant ?? 'rect';
  const shape = VARIANT_TO_SHAPE[variant];
  const secondary = defaultSecondaryFor(shape, size);
  if (shape !== 'rect') {
    warnings.push({
      code: 'secondary-rect-inferred',
      message: `キー ${id} (${variant}) の副矩形を標準形状から補いました。インスペクタで確認してください。`,
      keyId: id,
    });
  }

  const matrix = legacy.matrix ?? null;
  if (matrix && matrix.row === 0 && matrix.col === 0) {
    duplicateZeroMatrixCount.count += 1;
  }

  return {
    id,
    position: legacy.position ?? { x: 0, y: 0 },
    size,
    rotation: { angle: legacy.angle ?? 0, origin: null },
    shape,
    secondary,
    polygon: null,
    legends,
    matrix,
    decal: false,
    homing: false,
    ghost: false,
    color: null,
    legendColor: null,
    side: 'single',
  };
}

function migrateV0ToV1(raw: unknown, deps: ModelDeps, warnings: MigrationWarning[]): unknown {
  const legacy = raw as LegacyProjectData;
  const now = deps.now();
  const name = legacy.name ?? 'Untitled';

  const duplicateZeroMatrixCount = { count: 0 };
  const keys = (legacy.keys ?? []).map((k) => migrateKeyV0(k, deps, warnings, duplicateZeroMatrixCount));

  if (duplicateZeroMatrixCount.count >= 2) {
    warnings.push({
      code: 'matrix-duplicate-suspected',
      message: 'マトリクスが重複しています。自動割り当ての実行をおすすめします。',
      keyId: null,
    });
  }

  const project: ProjectModel = {
    schemaVersion: 1,
    id: legacy.id ?? deps.newId(),
    name,
    keys,
    meta: {
      keyboardName: name,
      manufacturer: '',
      maintainer: '',
      url: '',
      usb: { vid: '0xFEED', pid: '0x0000', deviceVersion: '0.0.1' },
      diodeDirection: 'COL2ROW',
      split: false,
    },
    createdAt: legacy.createdAt ?? now,
    updatedAt: legacy.updatedAt ?? now,
  };

  return project;
}
