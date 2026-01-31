import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import MainCanvas from '@/components/editor/CanvasArea/MainCanvas';
import { useStore } from '@/store/useStore';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Mock HTMLElement offset dimensions
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 1000 });
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 800 });

// Mock localStorage for Zustand persist
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock KeyObject to track renders - BUT we want to test MainCanvas logic
// so we mock KeyObject to count its renders.
jest.mock('@/components/editor/CanvasArea/KeyObject', () => {
    const React = require('react');
    // We explicitly attach a render counter
    const KeyObjectMock = React.memo((props: any) => {
        KeyObjectMock.renderCount = (KeyObjectMock.renderCount || 0) + 1;
        return <div data-testid="key-object" />;
    });
    // Add static property to track counts
    (KeyObjectMock as any).renderCount = 0;
    (KeyObjectMock as any).displayName = 'KeyObject';
    return KeyObjectMock;
});

// Import the mocked component to access the counter
import KeyObject from '@/components/editor/CanvasArea/KeyObject';
const MockKeyObject = KeyObject as unknown as { renderCount: number };

// Mock GridBackground
jest.mock('@/components/editor/CanvasArea/GridBackground', () => {
    return function MockGridBackground() {
        return <div data-testid="grid-background" />;
    };
});

// Mock Konva to avoid canvas issues in JSDOM
jest.mock('react-konva', () => {
    const React = require('react');
    const Stage = ({ children, ...props }: any) => <div data-testid="stage" {...props}>{children}</div>;
    const Layer = ({ children }: any) => <div data-testid="layer">{children}</div>;
    const Rect = (props: any) => <div data-testid="rect" {...props} />;
    return { Stage, Layer, Rect };
});

describe('MainCanvas Rendering Benchmark', () => {
    beforeEach(() => {
        MockKeyObject.renderCount = 0;
        useStore.getState().createProject();
        // Clear selection
        useStore.getState().clearSelection();
    });

    it('should not re-render keys when pan changes', async () => {
        // 1. Setup: Add 50 keys
        const store = useStore.getState();
        act(() => {
            store.addKeys(50, {
                position: { x: 0, y: 0 },
                size: { w: 1, h: 1 },
                angle: 0,
                rotationCenter: { x: 0, y: 0 },
                legends: { top: '', bottom: '', left: '', right: '' },
                matrix: { row: 0, col: 0 }
            });
        });

        // 2. Render MainCanvas
        const { getByTestId } = render(<MainCanvas />);

        // Initial render count: 50 keys
        expect(MockKeyObject.renderCount).toBeGreaterThanOrEqual(50);
        const initialCount = MockKeyObject.renderCount;

        // 3. Trigger Pan (Update Store)
        // If MainCanvas selectors are unoptimized, MainCanvas re-renders.
        // If MainCanvas re-renders, it recreates `memoizedKeys`.
        // BUT KeyObject is React.memo'd, so if props are same, it should NOT re-render.
        // However, we want to ensure efficient selectors too.

        act(() => {
            useStore.getState().setPan({ x: 100, y: 100 });
        });

        // 4. Check Render Count
        // Ideally, KeyObject render count should NOT increase.
        // If MainCanvas passes new props or recreates objects, it might increase.
        expect(MockKeyObject.renderCount).toBe(initialCount);
    });

    it('should not re-render keys when unrelated state changes (e.g. clipboard)', () => {
        const store = useStore.getState();
        act(() => {
            store.addKey({
                 position: { x: 0, y: 0 },
                size: { w: 1, h: 1 },
                angle: 0,
                rotationCenter: { x: 0, y: 0 },
                legends: { top: '', bottom: '', left: '', right: '' },
                matrix: { row: 0, col: 0 }
            });
        });

        render(<MainCanvas />);
        const initialCount = MockKeyObject.renderCount;

        act(() => {
            // Update an unrelated part of the store
            useStore.setState({ clipboard: [] });
        });

        // If MainCanvas subscribes to the WHOLE store, it re-renders.
        // Even if it re-renders, KeyObject *should* be protected by React.memo.
        // BUT we want to optimize the parent too.
        // We can't easily spy on MainCanvas render count directly in a functional component without wrapping it.
        // But if MainCanvas re-renders, it executes its body.
        // If we can verify MainCanvas re-renders, that would be good.

        // For now, let's just ensure Keys don't re-render.
        expect(MockKeyObject.renderCount).toBe(initialCount);
    });
});
