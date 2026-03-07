import { act } from "@testing-library/react";

import { useStore } from '@/store/useStore';

describe('Update Performance', () => {
    it('measures updateKey performance', () => {
        // Create 10000 keys
        const keys = Array.from({ length: 10000 }).map((_, i) => ({
            id: `key-${i}`,
            position: { x: i, y: i },
            size: { w: 1, h: 1 },
            angle: 0,
            rotationCenter: { x: 0, y: 0 },
            legends: { top: '', bottom: '', left: '', right: '' },
            matrix: { row: 0, col: 0 },
            variant: 'rect' as any
        }));

        useStore.setState({
            project: { id: 'test', name: 'Test', keys, createdAt: 0, updatedAt: 0 },
            selectedKeyIds: []
        });

        const start = performance.now();

        act(() => {
            // Update the last key to simulate worst case for findIndex but still avoid mapping 10000 elements
            useStore.getState().updateKey('key-9999', { angle: 90 });
        });
        const end = performance.now();

        console.log(`\nBENCHMARK: updateKey took ${(end - start).toFixed(2)}ms for 10000 keys`);
    });
});
