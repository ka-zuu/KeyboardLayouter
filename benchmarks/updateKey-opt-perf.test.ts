
import { useStore } from '@/store/useStore';

describe('Update Key Optimization Performance', () => {
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

        const idToUpdate = 'key-99999';
        const data = { angle: 90 };

        // Test map
        const startMap = performance.now();
        const mapKeys = keys.map((k) => {
            if (k.id !== idToUpdate) return k;
            return { ...k, ...data };
        });
        const endMap = performance.now();

        // Test findIndex
        const startFind = performance.now();
        const index = keys.findIndex(k => k.id === idToUpdate);
        let findKeys = keys;
        if (index !== -1) {
            findKeys = [...keys];
            findKeys[index] = { ...findKeys[index], ...data };
        }
        const endFind = performance.now();

        console.log(`\nBENCHMARK 100,000 keys:`);
        console.log(`map(): ${(endMap - startMap).toFixed(2)}ms`);
        console.log(`findIndex(): ${(endFind - startFind).toFixed(2)}ms`);

        expect(mapKeys[99999].angle).toBe(90);
        expect(findKeys[99999].angle).toBe(90);
    });
});
