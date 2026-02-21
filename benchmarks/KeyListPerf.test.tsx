import React from 'react';
import { render, act } from '@testing-library/react';
import { useStore } from '@/store/useStore';
import KeyList from '@/components/editor/CanvasArea/KeyList';
import { KeyData } from '@/types/mkd';

// Mock KeyObject to be simple, using relative path to avoid resolution issues
jest.mock('../components/editor/CanvasArea/KeyObject', () => {
    const React = require('react');
    // KeyObject no longer subscribes to store for data!
    return React.memo(({ id, data }: { id: string, data: any }) => {
        return <div data-testid="key-object">{id}</div>;
    });
});

describe('KeyList Performance', () => {
    it('measures update performance with 5000 keys (O(N))', () => {
        // Setup 5000 keys
        const keys: KeyData[] = [];
        for (let i = 0; i < 5000; i++) {
            keys.push({
                id: `k${i}`,
                position: { x: i * 1, y: 0 },
                size: { w: 1, h: 1 },
                angle: 0,
                rotationCenter: { x: 0, y: 0 },
                legends: {},
                matrix: { row: 0, col: i },
                variant: 'rect'
            });
        }

        useStore.setState({
            project: {
                id: 'p1',
                name: 'Perf Test',
                keys: keys,
                createdAt: 0,
                updatedAt: 0
            },
            selectedKeyIds: []
        });

        // Render KeyList (no props needed for keys)
        const { rerender } = render(
            <KeyList
                selectedKeysSet={new Set()}
                onSelect={() => {}}
                onDragEnd={() => {}}
            />
        );

        const start = performance.now();

        // Update 1 key
        act(() => {
            useStore.getState().updateKey('k500', { position: { x: 100, y: 100 } });
        });

        const end = performance.now();
        console.log(`[Benchmark] Time to update 1 key with 5000 keys (O(N) rendering): ${(end - start).toFixed(2)}ms`);
    });
});
