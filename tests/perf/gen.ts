import { createKey } from '@/core/model/key';
import { createProject } from '@/core/model/project';
import type { ProjectModel } from '@/core/model/types';

/** 40 列 x 25 行 = 1000 キーのレイアウト。5 個に 1 個は 15° 回転 (SAT 経路を通す)。 */
export function generateProject(columns = 40, rows = 25): ProjectModel {
  const project = createProject('perf');
  const keys = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const rotated = (r * columns + c) % 5 === 0;
      keys.push(
        createKey({
          position: { x: c * 1.25, y: r * 1.25 },
          rotation: { angle: rotated ? 15 : 0, origin: null },
        }),
      );
    }
  }
  return { ...project, keys };
}
