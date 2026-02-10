import React from 'react';
import { render, act } from '@testing-library/react';
import KeyboardShortcuts from '@/components/editor/KeyboardShortcuts';
import { useStore } from '@/store/useStore';

// Mock addEventListener/removeEventListener to track churn
const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

describe('KeyboardShortcuts Performance', () => {
    beforeEach(() => {
        addEventListenerSpy.mockClear();
        removeEventListenerSpy.mockClear();
        // Reset store state relevant to the test
        act(() => {
            useStore.setState({ gridSize: 0.25 });
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should not re-bind event listeners when gridSize changes', () => {
        const { unmount } = render(<KeyboardShortcuts />);

        // Initial bind
        // One for keydown
        expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
        const initialCallCount = addEventListenerSpy.mock.calls.length;

        // Change gridSize
        act(() => {
            useStore.setState({ gridSize: 0.5 });
        });

        // Should NOT trigger removeEventListener or addEventListener again
        // If it did, removeEventListener would be called for 'keydown'
        // and addEventListener would be called again.

        // Check removeEventListener calls
        // We expect 0 calls to removeEventListener for 'keydown' specifically from our component
        // But since we can't easily filter by "our component", we just check total calls
        // or check arguments.

        // If re-bound, removeEventListener is called.
        const removeCalls = removeEventListenerSpy.mock.calls.filter(call => call[0] === 'keydown');
        expect(removeCalls.length).toBe(0);

        const addCalls = addEventListenerSpy.mock.calls.length;
        expect(addCalls).toBe(initialCallCount);

        unmount();
    });
});
