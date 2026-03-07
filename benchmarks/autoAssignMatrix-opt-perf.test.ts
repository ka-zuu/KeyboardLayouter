

describe('Auto Assign Matrix Optimization Performance', () => {
    it('measures map vs for loop', () => {
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

        const updates = new Map();
        for (let i = 0; i < 5000; i++) {
            updates.set(`key-${i * 10}`, { row: 1, col: 1 });
        }

        // Test map
        const startMap = performance.now();
        const mapKeys = keys.map(k => {
            const update = updates.get(k.id);
            if (!update) return k;
            return { ...k, matrix: { ...k.matrix, ...update } };
        });
        const endMap = performance.now();

        // Test loop
        const startLoop = performance.now();
        const loopKeys = [...keys];
        for (let i = 0; i < loopKeys.length; i++) {
            const k = loopKeys[i];
            const update = updates.get(k.id);
            if (update) {
                loopKeys[i] = { ...k, matrix: { ...k.matrix, ...update } };
            }
        }
        const endLoop = performance.now();

        console.log(`\nBENCHMARK 100,000 keys auto assigning 5,000 keys:`);
        console.log(`map(): ${(endMap - startMap).toFixed(2)}ms`);
        console.log(`loop(): ${(endLoop - startLoop).toFixed(2)}ms`);

        expect(mapKeys[0].matrix.row).toBe(1);
        expect(loopKeys[0].matrix.row).toBe(1);
    });
});
