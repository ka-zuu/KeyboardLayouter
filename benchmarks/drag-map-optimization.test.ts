import { describe, test } from '@jest/globals';

describe('Map Construction vs Set Lookup Optimization', () => {
    const NUM_KEYS = 2000;
    const SELECT_RATIOS = [0.01, 0.1, 0.5, 1.0]; // 1%, 10%, 50%, 100%

    // Setup data
    const keys = Array.from({ length: NUM_KEYS }, (_, i) => ({
        id: `key-${i}`,
        val: i
    }));

    SELECT_RATIOS.forEach(ratio => {
        test(`Benchmark ratio ${ratio}`, () => {
            const numSelect = Math.floor(NUM_KEYS * ratio);
            // Select keys (just first N for simplicity)
            const selectedIds = [];
            for(let i=0; i<numSelect; i++) {
                selectedIds.push(keys[i].id);
            }

            // Baseline: Map Construction
            const start1 = performance.now();
            for(let i=0; i<1000; i++) {
                const keysById = new Map(keys.map(k => [k.id, k]));
                const updates = selectedIds.map(id => {
                    const key = keysById.get(id);
                    if (!key) return null;
                    return { id: key.id };
                }).filter(u => u !== null);
            }
            const end1 = performance.now();
            const timeBaseline = end1 - start1;

            // Optimization: Set Lookup
            const start2 = performance.now();
            for(let i=0; i<1000; i++) {
                const selectedSet = new Set(selectedIds);
                const updates = [];
                for(const key of keys) {
                    if (selectedSet.has(key.id)) {
                         updates.push({ id: key.id });
                    }
                }
            }
            const end2 = performance.now();
            const timeOptimized = end2 - start2;

            console.log(`Ratio ${ratio}: Map=${timeBaseline.toFixed(2)}ms, Set=${timeOptimized.toFixed(2)}ms, Improvement=${((timeBaseline - timeOptimized) / timeBaseline * 100).toFixed(1)}%`);
        });
    });
});
