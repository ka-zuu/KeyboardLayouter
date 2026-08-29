import { describe, expect, it } from 'vitest';
import { createKey } from '@/core/model/key';
import { createProject } from '@/core/model/project';
import type { ProjectModel } from '@/core/model/types';
import { buildScene, LOD_SCALE_THRESHOLD } from '@/ui/canvas/scene';

let seq = 0;
const deps = { newId: () => `id-${(seq++).toString()}`, now: () => 1700000000000 };

function projectWith(keys: ReturnType<typeof createKey>[]): ProjectModel {
  return { ...createProject('Test', deps), keys };
}

describe('buildScene', () => {
  it('ビューポート内のキーだけを含める (カリング)', () => {
    const inView = createKey({ position: { x: 1, y: 1 } }, deps);
    const farAway = createKey({ position: { x: 500, y: 500 } }, deps);
    const project = projectWith([inView, farAway]);

    const scene = buildScene(
      project,
      { scale: 1, panPx: { x: 0, y: 0 }, selectedKeyIds: [], showMatrix: false },
      { width: 600, height: 400 },
    );

    const ids = scene.keys.map((k) => k.key.id);
    expect(ids).toContain(inView.id);
    expect(ids).not.toContain(farAway.id);
  });

  it('カリング境界近くのキーは余白のぶん含まれる', () => {
    // scale=1, viewport 600x400 px → 表示範囲は 0〜10U, 0〜6.67U。
    // 境界から少し外 (11U) だが余白 (2U) 以内なので含まれる。
    const nearEdge = createKey({ position: { x: 11, y: 1 } }, deps);
    const project = projectWith([nearEdge]);

    const scene = buildScene(
      project,
      { scale: 1, panPx: { x: 0, y: 0 }, selectedKeyIds: [], showMatrix: false },
      { width: 600, height: 400 },
    );

    expect(scene.keys.map((k) => k.key.id)).toContain(nearEdge.id);
  });

  it(`scale < ${LOD_SCALE_THRESHOLD.toString()} のとき刻印と 1U グリッドを省く`, () => {
    const project = projectWith([createKey({}, deps)]);

    const zoomedOut = buildScene(project, { scale: 0.3, panPx: { x: 0, y: 0 }, selectedKeyIds: [], showMatrix: false }, {
      width: 600,
      height: 400,
    });
    expect(zoomedOut.showLegends).toBe(false);
    expect(zoomedOut.showMinorGrid).toBe(false);

    const zoomedIn = buildScene(project, { scale: 1, panPx: { x: 0, y: 0 }, selectedKeyIds: [], showMatrix: false }, {
      width: 600,
      height: 400,
    });
    expect(zoomedIn.showLegends).toBe(true);
    expect(zoomedIn.showMinorGrid).toBe(true);
  });

  it('selectedKeyIds を Set として反映する', () => {
    const key = createKey({}, deps);
    const project = projectWith([key]);
    const scene = buildScene(
      project,
      { scale: 1, panPx: { x: 0, y: 0 }, selectedKeyIds: [key.id], showMatrix: false },
      { width: 600, height: 400 },
    );
    expect(scene.selectedKeyIds.has(key.id)).toBe(true);
  });

  it('回転していないキーの localCenter は幾何中心 (相対座標)', () => {
    const key = createKey({ position: { x: 2, y: 3 }, size: { w: 2, h: 1 } }, deps);
    const project = projectWith([key]);
    const scene = buildScene(
      project,
      { scale: 1, panPx: { x: 0, y: 0 }, selectedKeyIds: [], showMatrix: false },
      { width: 600, height: 400 },
    );
    expect(scene.keys[0]!.localCenter).toEqual({ x: 1, y: 0.5 });
  });

  it('pxPerU は scale に比例する', () => {
    const project = projectWith([]);
    const scene = buildScene(project, { scale: 2, panPx: { x: 0, y: 0 }, selectedKeyIds: [], showMatrix: false }, {
      width: 600,
      height: 400,
    });
    expect(scene.pxPerU).toBe(120);
  });
});
