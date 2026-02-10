import React from 'react';
import { render, act } from '@testing-library/react';
import KeyboardShortcuts from '@/components/editor/KeyboardShortcuts';
import { useStore } from '@/store/useStore';

// Mock performance.now if needed, but JSDOM usually has it.
// If not, use Date.now()

describe('KeyboardShortcuts Subscription Overhead', () => {
    it('measures update performance with KeyboardShortcuts mounted', () => {
        const { unmount } = render(<KeyboardShortcuts />);

        const start = performance.now();

        // Perform many updates to state to trigger store listeners
        // We use 'act' to flush effects if any, but store updates are synchronous for listeners usually.
        // However, Zustand listeners run synchronously.

        // We update 'scale' which is simple and doesn't involve complex logic in store
        act(() => {
            for (let i = 0; i < 50000; i++) {
               useStore.setState({ scale: i });
            }
        });

        const end = performance.now();
        console.log(`[Benchmark] Time taken for 50000 updates: ${(end - start).toFixed(2)}ms`);

        unmount();
    });
});
