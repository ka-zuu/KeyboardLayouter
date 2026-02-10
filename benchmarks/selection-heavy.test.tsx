import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import MainCanvas from '@/components/editor/CanvasArea/MainCanvas';
import { useStore } from '@/store/useStore';

// Global mock pointer control
const mockPointer = { x: 0, y: 0 };

// Mock KeyList
jest.mock('../components/editor/CanvasArea/KeyList', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    const MockKeyList = () => <div data-testid="key-list" />;
    MockKeyList.displayName = 'KeyList';
    return React.memo(MockKeyList);
});

// Mock GridBackground
jest.mock('../components/editor/CanvasArea/GridBackground', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    const MockGrid = () => <div>Grid</div>;
    MockGrid.displayName = 'GridBackground';
    return MockGrid;
});

// Mock Konva
jest.mock('react-konva', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Stage = React.forwardRef((props: any, ref: any) => {
    const stageObject = React.useMemo(() => ({
        getPointerPosition: () => ({ ...mockPointer }),
        getRelativePointerPosition: () => ({ ...mockPointer }),
        x: () => 0,
        y: () => 0,
        scaleX: () => 1,
        width: () => 800,
        height: () => 600,
        findOne: () => null,
        batchDraw: jest.fn(),
        container: () => null,
    }), []);

    React.useImperativeHandle(ref, () => stageObject);

    return (
        <div
            data-testid="stage"
            onMouseDown={(e) => props.onMouseDown?.({ evt: { ...e, button: 0, shiftKey: false }, target: stageObject, currentTarget: stageObject })}
            onMouseMove={(e) => props.onMouseMove?.({ evt: { ...e, type: 'mousemove' }, target: stageObject, currentTarget: stageObject })}
            onMouseUp={(e) => props.onMouseUp?.({ evt: { ...e, button: 0, shiftKey: false, type: 'mouseup' }, target: stageObject, currentTarget: stageObject })}
        >
            {props.children}
        </div>
    );
  });
  Stage.displayName = 'Stage';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Rect = React.forwardRef((props: any, ref: any) => {
      // We need to keep track of visibility and dimensions for selection logic
      const state = React.useRef({ visible: false, x: 0, y: 0, width: 0, height: 0 });

      React.useImperativeHandle(ref, () => ({
          visible: (v: boolean) => { if (v !== undefined) state.current.visible = v; return state.current.visible; },
          x: (v: number) => { if (v !== undefined) state.current.x = v; return state.current.x; },
          y: (v: number) => { if (v !== undefined) state.current.y = v; return state.current.y; },
          width: (v: number) => { if (v !== undefined) state.current.width = v; return state.current.width; },
          height: (v: number) => { if (v !== undefined) state.current.height = v; return state.current.height; },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setAttrs: (attrs: any) => { Object.assign(state.current, attrs); },
          getLayer: () => ({ batchDraw: jest.fn() }),
      }));
      return <div data-testid="rect">Rect</div>;
  });
  Rect.displayName = 'Rect';

  const Layer = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

  return {
    Stage,
    Layer,
    Rect,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Group: ({ children }: any) => <div>{children}</div>,
  };
});

describe('Selection Heavy Benchmark', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 });
  });

  test('performance of selecting with 5000 keys', () => {
    const keys = [];
    // Create a 50x100 grid of keys. Each key is 1x1. Spaced by 1.5.
    // Total area approx 75x150.
    for (let i = 0; i < 5000; i++) {
        keys.push({
            id: `k${i}`,
            position: { x: (i % 50) * 1.5, y: Math.floor(i / 50) * 1.5 },
            size: { w: 1, h: 1 },
            angle: (i % 10 === 0) ? 45 : 0, // Mix of rotated and unrotated
            rotationCenter: { x: 0, y: 0 },
            legends: {},
            matrix: { row: 0, col: 0 },
            variant: 'rect'
        });
    }

    useStore.setState({
      project: {
        id: '1',
        name: 'Bench Project',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        keys: keys as any,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      scale: 1,
      pan: { x: 0, y: 0 },
      gridSize: 1,
      selectedKeyIds: [],
    });

    const { getByTestId } = render(<MainCanvas />);
    const stage = getByTestId('stage');

    // 1. MouseDown at -10,-10
    mockPointer.x = -10;
    mockPointer.y = -10;
    fireEvent.mouseDown(stage);

    // 2. MouseMove to -100,-100 (Covering no keys)
    mockPointer.x = -100;
    mockPointer.y = -100;
    fireEvent.mouseMove(stage);

    // 3. Measure MouseUp
    const start = performance.now();
    fireEvent.mouseUp(stage);
    const end = performance.now();

    console.log(`Selection time for 5000 keys: ${(end - start).toFixed(2)}ms`);

    // Verify no keys were selected
    const selectedIds = useStore.getState().selectedKeyIds;
    console.log(`Selected ${selectedIds.length} keys`);
    expect(selectedIds.length).toBe(0);
  });
});
