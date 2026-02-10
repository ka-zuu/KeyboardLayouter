import { describe, test, jest } from '@jest/globals';
import { useStore } from '@/store/useStore';

// Mock uuid
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-' + Math.random(),
}));

describe('Persistence Benchmark', () => {
  const NUM_KEYS = 5000; // Large enough to notice serialization cost

  test(`updateKey performance with ${NUM_KEYS} keys`, () => {
    // Setup initial large state
    const keys = Array.from({ length: NUM_KEYS }, (_, i) => ({
      id: `key-${i}`,
      position: { x: i, y: 0 },
      size: { w: 1, h: 1 },
      rotationCenter: { x: 0, y: 0 },
      matrix: { row: 0, col: i },
      legends: { top: 'A', bottom: '', left: '', right: '' },
      variant: 'rect' as const
    }));

    useStore.setState({
        project: {
            id: 'bench-persist',
            name: 'Bench Persist',
            keys,
            createdAt: 0,
            updatedAt: 0
        },
        selectedKeyIds: []
    });

    // Measure update of a single key
    const start = performance.now();

    // Simulate rapid updates (e.g. drag)
    const updates = 100;
    for (let i = 0; i < updates; i++) {
        useStore.getState().updateKey('key-0', { position: { x: i, y: i } });
    }

    const end = performance.now();
    const duration = end - start;
    console.log(`\nBENCHMARK: ${updates} updates with ${NUM_KEYS} keys took ${duration.toFixed(2)}ms\n`);
  });
});
