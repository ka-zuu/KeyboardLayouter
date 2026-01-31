import React, { useRef } from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import MainCanvas from './MainCanvas';
import { useStore } from '@/store/useStore';
import KeyObject from './KeyObject'; // Import the mocked component

// Mock mocks
jest.mock('@/store/useStore');
jest.mock('./GridBackground', () => () => <div data-testid="grid-background" />);

// Mock KeyObject to track renders
jest.mock('./KeyObject', () => {
    return jest.fn(() => <div data-testid="key-object" />);
});

// Mock react-konva
jest.mock('react-konva', () => {
    const React = require('react');
    return {
        Stage: React.forwardRef(({ children, onMouseDown, onMouseMove, onMouseUp, ...props }: any, ref: any) => {
            // Create a stable instance object for the stage
            const stageInstance = React.useMemo(() => ({
                getRelativePointerPosition: () => ({ x: 100, y: 100 }),
                getPointerPosition: () => ({ x: 100, y: 100 }),
                scaleX: () => 1,
                x: () => 0,
                y: () => 0,
                // Add explicit properties to mimic Konva Node if needed
                nodeType: 'Stage'
            }), []);

            // Mock Stage Ref functionality
            React.useImperativeHandle(ref, () => stageInstance);

            return (
                <div
                    data-testid="stage"
                    onMouseDown={(e) => {
                         const evt = {
                             target: stageInstance, // Match the ref object
                             evt: { ...e.nativeEvent, button: 0, shiftKey: false },
                             cancelBubble: false
                         };
                         onMouseDown && onMouseDown(evt);
                    }}
                    onMouseMove={(e) => {
                         const evt = {
                             target: stageInstance,
                             evt: { ...e.nativeEvent, preventDefault: () => {} },
                             cancelBubble: false
                         };
                         onMouseMove && onMouseMove(evt);
                    }}
                    onMouseUp={(e) => {
                         const evt = {
                             target: stageInstance,
                             evt: { ...e.nativeEvent },
                             cancelBubble: false
                         };
                         onMouseUp && onMouseUp(evt);
                    }}
                    {...props}
                >
                    {children}
                </div>
            );
        }),
        Layer: ({ children }: any) => <div data-testid="layer">{children}</div>,
        Rect: () => <div data-testid="rect" />,
    };
});

describe('MainCanvas Performance', () => {
    const mockStore = useStore as unknown as jest.Mock;

    const mockProject = {
        id: 'test-project',
        name: 'Test Project',
        keys: [
            {
                id: 'key-1',
                position: { x: 0, y: 0 },
                size: { w: 1, h: 1 },
                rotationCenter: { x: 0, y: 0 },
                legends: { top: '', bottom: '', left: '', right: '' },
                matrix: { row: 0, col: 0 },
                angle: 0
            },
            {
                id: 'key-2',
                position: { x: 1, y: 0 },
                size: { w: 1, h: 1 },
                rotationCenter: { x: 0, y: 0 },
                legends: { top: '', bottom: '', left: '', right: '' },
                matrix: { row: 0, col: 1 },
                angle: 0
            }
        ]
    };

    beforeEach(() => {
        // Mock offsetWidth/Height for MainCanvas dimension check
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 });

        jest.clearAllMocks();
        mockStore.mockReturnValue({
            project: mockProject,
            scale: 1,
            pan: { x: 0, y: 0 },
            setZoom: jest.fn(),
            setPan: jest.fn(),
            selectKey: jest.fn(),
            selectKeys: jest.fn(),
            clearSelection: jest.fn(),
            selectedKeyIds: [],
            addKey: jest.fn(),
            gridSize: 1
        });
    });

    it('re-renders keys unnecessarily during selection box drag', () => {
        const { getByTestId } = render(<MainCanvas />);

        // Initial Render
        expect(KeyObject).toHaveBeenCalledTimes(2);
        (KeyObject as jest.Mock).mockClear();

        const stage = getByTestId('stage');

        // Start Selection (MouseDown)
        fireEvent.mouseDown(stage, { button: 0, clientX: 0, clientY: 0 });

        // Move Mouse to update selection box
        // This causes setState in MainCanvas -> Re-render
        fireEvent.mouseMove(stage, { clientX: 50, clientY: 50 });

        // Assert: We expect KeyObject NOT to be called again because of memoization
        expect(KeyObject).toHaveBeenCalledTimes(0);

        // Another move
        (KeyObject as jest.Mock).mockClear();
        fireEvent.mouseMove(stage, { clientX: 100, clientY: 100 });
        expect(KeyObject).toHaveBeenCalledTimes(0);
    });
});
