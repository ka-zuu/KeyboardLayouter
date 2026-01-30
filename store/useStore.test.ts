import { act } from 'react';
import { useStore } from './useStore';

// Mock uuid to avoid ESM issues
jest.mock('uuid', () => ({
  v4: () => 'test-id-' + Math.random(),
}));

describe('useStore Deep Merge', () => {
  const initialState = useStore.getState();

  beforeEach(() => {
    useStore.setState(initialState, true); // Reset to initial state
    useStore.setState({
        project: {
            id: 'test-project',
            name: 'Test Project',
            keys: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        },
        selectedKeyIds: [],
    });
  });

  test('updateKey should deep merge legends', () => {
    const { addKey, updateKey } = useStore.getState();

    // Add a key
    act(() => {
      addKey({
        position: { x: 0, y: 0 },
        size: { w: 1, h: 1 },
        angle: 0,
        rotationCenter: { x: 0, y: 0 },
        legends: { top: 'Top', bottom: 'Bottom', left: 'Left', right: 'Right' },
        matrix: { row: 0, col: 0 },
      });
    });

    const keyId = useStore.getState().project.keys[0].id;

    // Update only 'top' legend (Partial update simulation)
    // We cast to any to simulate runtime behavior or loose types
    act(() => {
        updateKey(keyId, { legends: { top: 'NewTop' } } as any);
    });

    const updatedKey = useStore.getState().project.keys[0];

    expect(updatedKey.legends.top).toBe('NewTop');
    expect(updatedKey.legends.bottom).toBe('Bottom'); // Should be preserved
    expect(updatedKey.legends.left).toBe('Left');
    expect(updatedKey.legends.right).toBe('Right');
  });

  test('updateKey should deep merge matrix', () => {
    const { addKey, updateKey } = useStore.getState();

    act(() => {
        addKey({
            position: { x: 0, y: 0 },
            size: { w: 1, h: 1 },
            angle: 0,
            rotationCenter: { x: 0, y: 0 },
            legends: { top: '', bottom: '', left: '', right: '' },
            matrix: { row: 1, col: 1 },
        });
    });
    const keyId = useStore.getState().project.keys[0].id;

    act(() => {
        updateKey(keyId, { matrix: { row: 2 } } as any);
    });

    const updatedKey = useStore.getState().project.keys[0];
    expect(updatedKey.matrix.row).toBe(2);
    expect(updatedKey.matrix.col).toBe(1); // Preserved
  });

  test('updateKeys (batch) should deep merge size', () => {
    const { addKey, updateKeys } = useStore.getState();

    act(() => {
        addKey({
            position: { x: 0, y: 0 },
            size: { w: 1, h: 1 },
            angle: 0,
            rotationCenter: { x: 0, y: 0 },
            legends: { top: '', bottom: '', left: '', right: '' },
            matrix: { row: 0, col: 0 },
        });
    });
    const keyId = useStore.getState().project.keys[0].id;

    act(() => {
        updateKeys([{ id: keyId, data: { size: { w: 2 } } as any }]);
    });

    const updatedKey = useStore.getState().project.keys[0];
    expect(updatedKey.size.w).toBe(2);
    expect(updatedKey.size.h).toBe(1); // Preserved
  });
});
