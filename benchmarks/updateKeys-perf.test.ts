import { act } from "@testing-library/react";

import { useStore } from '@/store/useStore';

describe('Update Keys Performance', () => {
    it('measures updateKeys performance', () => {
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

        // Create updates for half the keys
        const updates = keys.slice(0, 5000).map(k => ({
            id: k.id,
            data: { angle: 90 }
        }));

        const start = performance.now();

        act(() => {
            useStore.getState().updateKeys(updates);
        });
        const end = performance.now();

        console.log(`\nBENCHMARK: updateKeys took ${(end - start).toFixed(2)}ms for updating 5000 of 10000 keys`);
    });
});
