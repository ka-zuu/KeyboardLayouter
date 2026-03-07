
import { useStore } from '@/store/useStore';

describe('Move Selected Keys Optimization Performance', () => {
    it('measures finding index vs map', () => {
        // Create 100000 keys
        const keys = Array.from({ length: 100000 }).map((_, i) => ({
            id: `key-${i}`,
            position: { x: i, y: i },
            size: { w: 1, h: 1 },
            angle: 0,
            rotationCenter: { x: 0, y: 0 },
            legends: { top: '', bottom: '', left: '', right: '' },
            matrix: { row: 0, col: 0 },
            variant: 'rect' as any
        }));

        const selectedKeyIds = ['key-0', 'key-50000', 'key-99999'];
        const delta = { x: 1, y: 1 };
        const selectedKeySet = new Set(selectedKeyIds);

        // Test map
        const startMap = performance.now();
        const mapKeys = keys.map(k => {
            if (!selectedKeySet.has(k.id)) return k;
            return {
                ...k,
                position: {
                    x: Math.max(0, k.position.x + delta.x),
                    y: Math.max(0, k.position.y + delta.y)
                }
            };
        });
        const endMap = performance.now();

        // Test findIndex
        const startFind = performance.now();
        const findKeys = [...keys];
        for (const id of selectedKeyIds) {
            const index = findKeys.findIndex(k => k.id === id);
            if (index !== -1) {
                const k = findKeys[index];
                findKeys[index] = {
                    ...k,
                    position: {
                        x: Math.max(0, k.position.x + delta.x),
                        y: Math.max(0, k.position.y + delta.y)
                    }
                };
            }
        }
        const endFind = performance.now();

        console.log(`\nBENCHMARK 100,000 keys moving 3 keys:`);
        console.log(`map(): ${(endMap - startMap).toFixed(2)}ms`);
        console.log(`findIndex(): ${(endFind - startFind).toFixed(2)}ms`);

        expect(mapKeys[99999].position.x).toBe(100000);
        expect(findKeys[99999].position.x).toBe(100000);
    });
});
