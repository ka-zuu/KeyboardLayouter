import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import KeyObject from '@/components/editor/CanvasArea/KeyObject';
import { useStore } from '@/store/useStore';
import { KeyData } from '@/types/mkd';

// Mock findOne
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockFindOne = jest.fn((_selector) => ({
    rotation: jest.fn(),
    x: jest.fn(),
    y: jest.fn(),
}));

// Mock react-konva
jest.mock('react-konva', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    const { forwardRef, useImperativeHandle } = React;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const MockGroup = forwardRef((props: any, ref: any) => {
        useImperativeHandle(ref, () => ({
            cache: jest.fn(),
            getStage: () => ({
                findOne: mockFindOne,
                getPointerPosition: () => ({ x: 100, y: 100 }),
                getAbsolutePosition: () => ({ x: 0, y: 0 }),
            }),
            getAbsolutePosition: () => ({ x: 0, y: 0 }),
        }));
        return <div data-testid="group">{props.children}</div>;
    });
    MockGroup.displayName = 'Group';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const MockCircle = (props: any) => {
        return (
            <div
                data-testid="rotation-handle"
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                onMouseDown={(_e) => {
                    // Simulate Konva Event
                    const evt = {
                        target: {
                             getStage: () => ({ findOne: mockFindOne }),
                             position: jest.fn(),
                        },
                        cancelBubble: false
                    };
                    if (props.onDragStart) props.onDragStart(evt);
                }}
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                onMouseMove={(_e) => {
                    const evt = {
                         target: {
                             getStage: () => ({
                                 findOne: mockFindOne,
                                 getPointerPosition: () => ({ x: 200, y: 200 }), // Moved
                             }),
                         },
                         cancelBubble: false
                    };
                    if (props.onDragMove) props.onDragMove(evt);
                }}
            />
        );
    };

    return {
        Group: MockGroup,
        Circle: MockCircle,
        Rect: () => null,
        Text: () => null,
        Path: () => null,
    };
});

// Setup Store
const setupStore = (numKeys: number) => {
    const keys: KeyData[] = [];
    for(let i=0; i<numKeys; i++) {
        keys.push({
            id: `k${i}`,
            position: { x: i*20, y: 0 },
            size: { w: 1, h: 1 },
            rotationCenter: { x: 0.5, y: 0.5 },
            angle: 0,
            legends: {},
            matrix: { row: 0, col: 0 },
            variant: 'rect'
        });
    }

    useStore.setState({
        project: {
            id: 'p1',
            name: 'Test',
            keys,
            createdAt: 0,
            updatedAt: 0
        },
        selectedKeyIds: keys.map(k => k.id),
        snapEnabled: false,
        gridSize: 1
    });
};

describe('Rotation Performance', () => {
    beforeEach(() => {
        mockFindOne.mockClear();
    });

    it('calls findOne repeatedly during drag (Before Optimization)', () => {
        const NUM_KEYS = 100;
        setupStore(NUM_KEYS);

        // Render just one key (k0) which will act as the pivot/handle
        const { getByTestId } = render(
            <KeyObject
                id="k0"
                isSelected={true}
                onSelect={jest.fn()}
                onDragEnd={jest.fn()}
            />
        );

        const handle = getByTestId('rotation-handle');

        // Start Drag
        fireEvent.mouseDown(handle);

        // At start, no findOne calls yet (current implementation)
        // OR if optimized, it might have calls.
        const startCalls = mockFindOne.mock.calls.length;

        // Move
        fireEvent.mouseMove(handle);

        const moveCalls = mockFindOne.mock.calls.length - startCalls;

        console.log(`Start Calls: ${startCalls}`);
        console.log(`Move Calls: ${moveCalls}`);

        // After optimization:
        // Move calls should be 0 (nodes are cached)
        expect(moveCalls).toBe(0);

        // Start calls should include the initial lookup (approx 100)
        expect(startCalls).toBeGreaterThanOrEqual(NUM_KEYS);
    });
});
