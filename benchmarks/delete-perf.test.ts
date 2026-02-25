// Mock uuid to avoid ESM issues and improve setup speed
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-' + Math.random(),
}));

import { useStore } from '@/store/useStore';

describe('Performance Benchmark', () => {
  const NUM_KEYS = 10000;

  test(`deleteSelectedKeys performance with ${NUM_KEYS} keys`, () => {
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

    // 1. Setup: Add many keys
    const keys = Array.from({ length: NUM_KEYS }, (_, i) => ({
      id: `key-${i}`,
      position: { x: i, y: 0 },
      size: { w: 1, h: 1 },
      angle: 0,
      rotationCenter: { x: 0, y: 0 },
      matrix: { row: 0, col: i },
      legends: { top: 'A', bottom: '', left: '', right: '' },
      variant: 'rect' as const
    }));

    useStore.setState(state => ({
        project: {
            ...state.project,
            keys
        }
    }));

    // 2. Select ALL keys
    const allIds = keys.map(k => k.id);
    useStore.getState().selectKeys(allIds);

    // Verify setup
    expect(useStore.getState().project.keys.length).toBe(NUM_KEYS);
    expect(useStore.getState().selectedKeyIds.length).toBe(NUM_KEYS);

    // 3. Measure Delete
    const start = performance.now();
    useStore.getState().deleteSelectedKeys();
    const end = performance.now();

    const duration = end - start;
    console.log(`\nBENCHMARK: deleteSelectedKeys took ${duration.toFixed(2)}ms for ${NUM_KEYS} keys\n`);

    // Verify result
    expect(useStore.getState().project.keys.length).toBe(0);
  });
});
