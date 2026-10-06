import { describe, expect, it } from 'vitest';
import { moveKeys } from '@/core/commands/moveKeys';
import { keysIntersectingRect } from '@/core/geometry/select';
import { autoAssignMatrix } from '@/core/matrix/autoAssign';
import { serializeProject } from '@/io/project/serialize';
import { selectedKeysOf } from '@/state/selectors';
import { buildScene } from '@/ui/canvas/scene';
import { generateProject } from './gen';

// docs/TESTING.md#性能テスト。絶対値では落とさず、目標超過は警告に留める。
// 1000 キーが全て入る大きさのビューポート (最悪ケース)。
const VIEWPORT = { width: 3000, height: 2000 };
const project = generateProject();
const allIds = project.keys.map((k) => k.id);

function measure(name: string, targetMs: number, fn: () => void): number {
  fn(); // ウォームアップ (JIT・キャッシュ)
  const start = performance.now();
  fn();
  const ms = performance.now() - start;
  const line = `[perf] ${name}: ${ms.toFixed(1)}ms (目標 ${targetMs.toString()}ms)`;
  if (ms > targetMs) console.warn(`${line} 目標超過`);
  else console.log(line);
  return ms;
}

describe('1000 キーの性能', () => {
  it('1000 キーが生成されている', () => {
    expect(project.keys).toHaveLength(1000);
  });

  it('初回描画 (buildScene、キャッシュ無し)', () => {
    const fresh = generateProject();
    const start = performance.now();
    const scene = buildScene(fresh, { scale: 1, panPx: { x: 0, y: 0 }, selectedKeyIds: [], showMatrix: true }, VIEWPORT);
    const ms = performance.now() - start;
    console.log(`[perf] 初回描画: ${ms.toFixed(1)}ms (目標 500ms)`);
    expect(scene.keys.length).toBeGreaterThan(0);
  });

  it('全選択', () => {
    measure('全選択', 100, () => {
      const keys = selectedKeysOf(project, allIds);
      buildScene(project, { scale: 1, panPx: { x: 0, y: 0 }, selectedKeyIds: allIds, showMatrix: false }, VIEWPORT);
      expect(keys).toHaveLength(1000);
    });
  });

  it('100 キーの移動 (1 フレーム)', () => {
    const ids = allIds.slice(0, 100);
    buildScene(project, { scale: 1, panPx: { x: 0, y: 0 }, selectedKeyIds: ids, showMatrix: false }, VIEWPORT);
    measure('100 キー移動', 16, () => {
      const moved = moveKeys(project, ids, { x: 0.25, y: 0 });
      buildScene(moved, { scale: 1, panPx: { x: 0, y: 0 }, selectedKeyIds: ids, showMatrix: false }, VIEWPORT);
    });
  });

  it('矩形選択の判定', () => {
    measure('矩形選択', 50, () => {
      const ids = keysIntersectingRect(project.keys, { minX: 5, minY: 5, maxX: 35, maxY: 25 });
      expect(ids.length).toBeGreaterThan(0);
    });
  });

  it('保存 (シリアライズ)', () => {
    measure('保存', 200, () => {
      serializeProject(project);
    });
  });

  it('自動マトリクス割り当て', () => {
    measure('マトリクス', 200, () => {
      autoAssignMatrix(project, null, { startRow: 0, startCol: 0 });
    });
  });
});
