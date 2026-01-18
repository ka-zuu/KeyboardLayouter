import { act } from '@testing-library/react';
// Mock uuid before importing useStore
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-' + Math.random(),
}));

import { useStore } from './useStore';

describe('useStore', () => {
  beforeEach(() => {
    // Reset store state
    const { createProject } = useStore.getState();
    // Clear storage
    localStorage.clear();
    useStore.setState({
        project: {
            id: 'test-project',
            name: 'Test Project',
            keys: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        },
        savedProjects: {},
        selectedKeyIds: [],
    });
  });

  it('should deep merge position in updateKey', () => {
    const { addKey, updateKey } = useStore.getState();

    // Add a key
    act(() => {
        addKey({
            position: { x: 10, y: 20 },
            size: { w: 1, h: 1 },
            angle: 0,
            rotationCenter: { x: 0, y: 0 },
            visualLegend: 'A',
            matrix: { row: 0, col: 0 },
            variant: 'rect'
        });
    });

    const keyId = useStore.getState().project.keys[0].id;

    act(() => {
        updateKey(keyId, { position: { x: 15 } });
    });

    const key = useStore.getState().project.keys[0];
    expect(key.position.x).toBe(15);
    expect(key.position.y).toBe(20); // Should be preserved
  });

  it('should deep merge position in updateKeys', () => {
    const { addKey, updateKeys } = useStore.getState();

    // Add a key
    act(() => {
        addKey({
            position: { x: 10, y: 20 },
            size: { w: 1, h: 1 },
            angle: 0,
            rotationCenter: { x: 0, y: 0 },
            visualLegend: 'A',
            matrix: { row: 0, col: 0 },
            variant: 'rect'
        });
    });

    const keyId = useStore.getState().project.keys[0].id;

    // Update only x
    act(() => {
        updateKeys([{ id: keyId, data: { position: { x: 15 } } }]);
    });

    const key = useStore.getState().project.keys[0];
    expect(key.position.x).toBe(15);
    expect(key.position.y).toBe(20); // Should be preserved
  });
});
