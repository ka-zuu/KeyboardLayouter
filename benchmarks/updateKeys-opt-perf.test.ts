

describe('Update Keys Optimization Performance', () => {
    it('measures map + map vs copy + for loop', () => {
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

        const updates = Array.from({ length: 50 }).map((_, i) => ({
            id: `key-${i * 100}`,
            data: { angle: 90 }
        }));

        // Test map
        const startMap = performance.now();
        const updateMap = new Map(updates.map(u => [u.id, u.data]));
        const mapKeys = keys.map(k => {
            const data = updateMap.get(k.id);
            if (!data) return k;
            return { ...k, ...data };
        });
        const endMap = performance.now();

        // Test copy + loop + findIndex
        const startLoop = performance.now();
        const loopKeys = [...keys];
        for (const update of updates) {
            const index = loopKeys.findIndex(k => k.id === update.id);
            if (index !== -1) {
                loopKeys[index] = { ...loopKeys[index], ...update.data };
            }
        }
        const endLoop = performance.now();

        console.log(`\nBENCHMARK 100,000 keys updating 50 keys:`);
        console.log(`map(): ${(endMap - startMap).toFixed(2)}ms`);
        console.log(`copy + loop + findIndex(): ${(endLoop - startLoop).toFixed(2)}ms`);

        expect(mapKeys[0].angle).toBe(90);
        expect(loopKeys[0].angle).toBe(90);
    });

    it('measures map + map vs copy + for loop with many updates', () => {
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

        const updates = Array.from({ length: 5000 }).map((_, i) => ({
            id: `key-${i * 10}`,
            data: { angle: 90 }
        }));

        // Test map
        const startMap = performance.now();
        const updateMap = new Map(updates.map(u => [u.id, u.data]));
        const mapKeys = keys.map(k => {
            const data = updateMap.get(k.id);
            if (!data) return k;
            return { ...k, ...data };
        });
        const endMap = performance.now();

        // Test map lookup over map (what we currently do)
        const startLookupMap = performance.now();
        const updateMap2 = new Map(updates.map(u => [u.id, u.data]));
        const mapLookupKeys = [...keys];
        for (let i = 0; i < mapLookupKeys.length; i++) {
            const k = mapLookupKeys[i];
            const data = updateMap2.get(k.id);
            if (data) {
                mapLookupKeys[i] = { ...k, ...data };
            }
        }
        const endLookupMap = performance.now();

        // Test copy + loop + findIndex
        const startLoop = performance.now();
        const loopKeys = [...keys];
        for (const update of updates) {
            const index = loopKeys.findIndex(k => k.id === update.id);
            if (index !== -1) {
                loopKeys[index] = { ...loopKeys[index], ...update.data };
            }
        }
        const endLoop = performance.now();

        console.log(`\nBENCHMARK 100,000 keys updating 5,000 keys:`);
        console.log(`map(): ${(endMap - startMap).toFixed(2)}ms`);
        console.log(`for loop + map lookup(): ${(endLookupMap - startLookupMap).toFixed(2)}ms`);
        console.log(`copy + loop + findIndex(): ${(endLoop - startLoop).toFixed(2)}ms`);

        expect(mapKeys[0].angle).toBe(90);
        expect(loopKeys[0].angle).toBe(90);
        expect(mapLookupKeys[0].angle).toBe(90);
    });
});
