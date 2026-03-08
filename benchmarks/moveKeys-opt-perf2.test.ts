

describe('Move Selected Keys Optimization Performance 2', () => {
    it('measures finding index vs loop', () => {
        // Create 100000 keys
        const keys = Array.from({ length: 100000 }).map((_, i) => ({
            id: `key-${i}`,
            position: { x: i, y: i },
            size: { w: 1, h: 1 },
            angle: 0,
            rotationCenter: { x: 0, y: 0 },
            legends: { top: '', bottom: '', left: '', right: '' },
            matrix: { row: 0, col: 0 },
            variant: 'rect'
        }));

        const selectedKeyIds = Array.from({ length: 5000 }).map((_, i) => `key-${i * 10}`);
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

        // Test map loop
        const startLoop = performance.now();
        const loopKeys = [...keys];
        for (let i = 0; i < loopKeys.length; i++) {
            const k = loopKeys[i];
            if (selectedKeySet.has(k.id)) {
                loopKeys[i] = {
                    ...k,
                    position: {
                        x: Math.max(0, k.position.x + delta.x),
                        y: Math.max(0, k.position.y + delta.y)
                    }
                };
            }
        }
        const endLoop = performance.now();

        console.log(`\nBENCHMARK 100,000 keys moving 5,000 keys:`);
        console.log(`map(): ${(endMap - startMap).toFixed(2)}ms`);
        console.log(`loop(): ${(endLoop - startLoop).toFixed(2)}ms`);

        expect(mapKeys[10].position.x).toBe(11);
        expect(loopKeys[10].position.x).toBe(11);
    });
});
