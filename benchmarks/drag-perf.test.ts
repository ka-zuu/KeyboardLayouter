import { describe, test, expect, jest } from '@jest/globals';

// Mock uuid to avoid ESM issues
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-' + Math.random(),
}));

import { useStore } from '@/store/useStore';
import { KeyData } from '@/types/mkd';

describe('Drag Handler Performance Benchmark', () => {
  const NUM_KEYS = 10000;
  const NUM_SELECTED = 100;

  // Setup helpers
  const setupStore = () => {
      // Reset store
      useStore.setState({
          project: {
              id: 'bench',
              name: 'Bench',
              keys: [],
              createdAt: 0,
              updatedAt: 0
          },
          selectedKeyIds: []
      });

      // Add keys
      const keys: KeyData[] = Array.from({ length: NUM_KEYS }, (_, i) => ({
        id: `key-${i}`,
        position: { x: i, y: 0 },
        size: { w: 1, h: 1 },
        rotationCenter: { x: 0, y: 0 },
        matrix: { row: 0, col: i },
        legends: { top: 'A', bottom: '', left: '', right: '' },
        variant: 'rect'
      }));

      useStore.setState(state => ({
          project: {
              ...state.project,
              keys
          }
      }));

      // Select keys (first NUM_SELECTED keys)
      const selectedIds = keys.slice(0, NUM_SELECTED).map(k => k.id);
      useStore.getState().selectKeys(selectedIds);

      return keys[0].id; // Return the first selected key as the "dragged" key
  };

  // Original Implementation
  const handleKeyDragEndOriginal = (id: string, x: number, y: number) => {
      const { selectedKeyIds, project } = useStore.getState();
      if (selectedKeyIds.includes(id)) {
          // Performance optimization: Create Map for O(1) lookup
          const keysById = new Map(project.keys.map(k => [k.id, k]));
          const draggedKey = keysById.get(id);
          if (!draggedKey) return;

          const deltaX = x - draggedKey.position.x;
          const deltaY = y - draggedKey.position.y;

          type UpdateType = { id: string; data: Partial<KeyData> };

          const updates = selectedKeyIds.map((selectedId): UpdateType | null => {
              const key = keysById.get(selectedId);
              if (!key) return null;
              return {
                  id: selectedId,
                  data: {
                      position: {
                          x: key.position.x + deltaX,
                          y: key.position.y + deltaY
                      }
                  }
              };
          }).filter((u): u is UpdateType => u !== null);

          // Mock updateKeys to avoid measuring store update overhead (we only care about preparation)
          // useStore.getState().updateKeys(updates);
          return updates.length;
      }
      return 0;
  };

  // Optimized Implementation
  const handleKeyDragEndOptimized = (id: string, x: number, y: number) => {
      const { selectedKeyIds, project } = useStore.getState();
      const selectedSet = new Set(selectedKeyIds);

      if (selectedSet.has(id)) {
          // 1. Find the dragged key directly
          const draggedKey = project.keys.find(k => k.id === id);
          if (!draggedKey) return;

          const deltaX = x - draggedKey.position.x;
          const deltaY = y - draggedKey.position.y;

          type UpdateType = { id: string; data: Partial<KeyData> };

          // 2. Iterate keys once to build updates for selected keys
          const updates: UpdateType[] = [];

          for (const key of project.keys) {
              if (selectedSet.has(key.id)) {
                   updates.push({
                      id: key.id,
                      data: {
                          position: {
                              x: key.position.x + deltaX,
                              y: key.position.y + deltaY
                          }
                      }
                   });
              }
          }

          // Mock updateKeys
          // useStore.getState().updateKeys(updates);
          return updates.length;
      }
      return 0;
  };

  test('Compare Drag Handler Performance', () => {
      const draggedId = setupStore();

      // Warmup
      handleKeyDragEndOriginal(draggedId, 10, 10);
      handleKeyDragEndOptimized(draggedId, 10, 10);

      const ITERATIONS = 100;

      // Measure Original
      const startOrig = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
          handleKeyDragEndOriginal(draggedId, 10 + i, 10 + i);
      }
      const endOrig = performance.now();
      const timeOrig = endOrig - startOrig;

      // Measure Optimized
      const startOpt = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
          handleKeyDragEndOptimized(draggedId, 10 + i, 10 + i);
      }
      const endOpt = performance.now();
      const timeOpt = endOpt - startOpt;

      console.log(`\nBENCHMARK RESULTS (${ITERATIONS} iterations, ${NUM_KEYS} keys, ${NUM_SELECTED} selected):`);
      console.log(`Original:  ${timeOrig.toFixed(2)} ms`);
      console.log(`Optimized: ${timeOpt.toFixed(2)} ms`);
      console.log(`Improvement: ${(timeOrig / timeOpt).toFixed(2)}x faster`);

      expect(timeOpt).toBeLessThan(timeOrig);
  });
});
