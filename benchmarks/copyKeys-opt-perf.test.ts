

describe('Copy Selected Keys Optimization Performance', () => {
    it('measures map + filter vs for loop', () => {
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
        const selectedKeySet = new Set(selectedKeyIds);

        // Test filter
        const startFilter = performance.now();
        const filterKeys = keys.filter(k => selectedKeySet.has(k.id));
        const endFilter = performance.now();

        // Test loop
        const startLoop = performance.now();
        const loopKeys = [];
        for (let i = 0; i < keys.length; i++) {
            if (selectedKeySet.has(keys[i].id)) {
                loopKeys.push(keys[i]);
            }
        }
        const endLoop = performance.now();

        console.log(`\nBENCHMARK 100,000 keys copying 5,000 keys:`);
        console.log(`filter(): ${(endFilter - startFilter).toFixed(2)}ms`);
        console.log(`loop(): ${(endLoop - startLoop).toFixed(2)}ms`);

        expect(filterKeys.length).toBe(5000);
        expect(loopKeys.length).toBe(5000);
    });
});
