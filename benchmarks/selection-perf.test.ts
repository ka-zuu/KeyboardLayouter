import { describe, test, expect } from '@jest/globals';
import { getRotatedRectPoints, doPolygonsIntersect } from '@/lib/geometry';
import { PIXELS_PER_U } from '@/lib/constants';

describe('Selection Performance Benchmark', () => {
    const NUM_KEYS = 10000;
    interface MockKey {
        id: string;
        position: { x: number; y: number };
        size: { w: number; h: number };
        angle: number;
        rotationCenter: { x: number; y: number };
    }
    const keys: MockKey[] = [];

    // Setup keys once
    for (let i = 0; i < NUM_KEYS; i++) {
        // Spread keys on a grid
        keys.push({
            id: `key-${i}`,
            position: { x: (i % 100) * 2, y: Math.floor(i / 100) * 2 },
            size: { w: 1, h: 1 },
            angle: i % 10 === 0 ? 45 : 0, // 10% rotated
            rotationCenter: { x: 0.5, y: 0.5 }
        });
    }

    // Selection box covering a subset (e.g. small area)
    const selectionBox = {
        startX: 50 * PIXELS_PER_U, startY: 50 * PIXELS_PER_U,
        endX: 70 * PIXELS_PER_U, endY: 70 * PIXELS_PER_U
    };

    const x1 = Math.min(selectionBox.startX, selectionBox.endX);
    const x2 = Math.max(selectionBox.startX, selectionBox.endX);
    const y1 = Math.min(selectionBox.startY, selectionBox.endY);
    const y2 = Math.max(selectionBox.startY, selectionBox.endY);

    const selectionRectPoints = [
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: y2 },
        { x: x1, y: y2 }
    ];

    test('Compare Baseline vs Optimized', () => {
        // --- Baseline ---
        const startBaseline = performance.now();
        let hitsBaseline = 0;

        keys.forEach(key => {
            const kx = key.position.x * PIXELS_PER_U;
            const ky = key.position.y * PIXELS_PER_U;
            const kw = key.size.w * PIXELS_PER_U;
            const kh = key.size.h * PIXELS_PER_U;

            const keyPoints = getRotatedRectPoints(
                kx, ky, kw, kh,
                key.angle,
                key.rotationCenter.x * PIXELS_PER_U,
                key.rotationCenter.y * PIXELS_PER_U
            );

            if (doPolygonsIntersect(selectionRectPoints, keyPoints)) {
                hitsBaseline++;
            }
        });
        const endBaseline = performance.now();
        const timeBaseline = endBaseline - startBaseline;

        // --- Optimized ---
        const startOptimized = performance.now();
        let hitsOptimized = 0;

        keys.forEach(key => {
            const kx = key.position.x * PIXELS_PER_U;
            const ky = key.position.y * PIXELS_PER_U;
            const kw = key.size.w * PIXELS_PER_U;
            const kh = key.size.h * PIXELS_PER_U;

            const keyPoints = getRotatedRectPoints(
                kx, ky, kw, kh,
                key.angle,
                key.rotationCenter.x * PIXELS_PER_U,
                key.rotationCenter.y * PIXELS_PER_U
            );

            // AABB Check
            let minX = keyPoints[0].x;
            let maxX = keyPoints[0].x;
            let minY = keyPoints[0].y;
            let maxY = keyPoints[0].y;

            for (let i = 1; i < keyPoints.length; i++) {
                const p = keyPoints[i];
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            }

            if (maxX < x1 || minX > x2 || maxY < y1 || minY > y2) {
                return;
            }

            if (doPolygonsIntersect(selectionRectPoints, keyPoints)) {
                hitsOptimized++;
            }
        });
        const endOptimized = performance.now();
        const timeOptimized = endOptimized - startOptimized;

        console.log(`\nBENCHMARK RESULTS (${NUM_KEYS} keys):`);
        console.log(`Baseline:  ${timeBaseline.toFixed(4)}ms (Hits: ${hitsBaseline})`);
        console.log(`Optimized: ${timeOptimized.toFixed(4)}ms (Hits: ${hitsOptimized})`);
        console.log(`Speedup:   ${(timeBaseline / timeOptimized).toFixed(2)}x\n`);

        expect(hitsOptimized).toBe(hitsBaseline);
        // Expect at least some improvement (allowing for noise, but this should be significant)
        // If it's too fast (e.g. small N), it might be noisy. 10000 keys should be stable.
    });
});
