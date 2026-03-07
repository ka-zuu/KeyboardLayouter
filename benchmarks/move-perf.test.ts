import { act } from "@testing-library/react";

import { useStore } from '@/store/useStore';

describe('Move Performance', () => {
    it('measures moveSelectedKeys performance', () => {
        // Create 10000 keys
        const keys = Array.from({ length: 10000 }).map((_, i) => ({
            id: `key-${i}`,
            position: { x: i, y: i },
            size: { w: 1, h: 1 },
            angle: 0,
            rotationCenter: { x: 0, y: 0 },
            legends: { top: '', bottom: '', left: '', right: '' },
            matrix: { row: 0, col: 0 },
            variant: 'rect'
        }));

        useStore.setState({
            project: { id: 'test', name: 'Test', keys, createdAt: 0, updatedAt: 0 },
            selectedKeyIds: keys.slice(0, 5000).map(k => k.id) // Select half
        });

        const start = performance.now();

        act(() => {
            useStore.getState().moveSelectedKeys({ x: 1, y: 1 });
        });
        const end = performance.now();

        console.log(`\nBENCHMARK: moveSelectedKeys took ${(end - start).toFixed(2)}ms for 10000 keys`);
    });
});
