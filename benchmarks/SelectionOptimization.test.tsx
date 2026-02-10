import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import MainCanvas from '../components/editor/CanvasArea/MainCanvas';
import { useStore } from '../store/useStore';
import * as geometry from '../lib/geometry';
import { KeyData } from '../types/mkd';

// Mock KeyList
jest.mock('../components/editor/CanvasArea/KeyList', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    const MockKeyList = () => <div data-testid="key-list" />;
    MockKeyList.displayName = 'KeyList';
    return jest.fn(MockKeyList);
});

// Mock GridBackground
jest.mock('../components/editor/CanvasArea/GridBackground', () => {
    const MockGrid = () => <div>Grid</div>;
    MockGrid.displayName = 'GridBackground';
    return MockGrid;
});

// Mock geometry
jest.mock('../lib/geometry', () => {
    const original = jest.requireActual('../lib/geometry');
    return {
        ...original,
        getRotatedRectPoints: jest.fn((...args) => original.getRotatedRectPoints(...args)),
    };
});

// Mock Konva
let mockPointerPosition = { x: 0, y: 0 };

jest.mock('react-konva', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Stage = React.forwardRef((props: any, ref: any) => {
    const stageRef = React.useRef({
        getPointerPosition: () => mockPointerPosition,
        getRelativePointerPosition: () => mockPointerPosition,
        x: () => 0,
        y: () => 0,
        scaleX: () => 1,
        width: () => 800,
        height: () => 600,
        findOne: () => null,
    });

    React.useImperativeHandle(ref, () => stageRef.current);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapEvent = (e: any) => {
        return {
            evt: e.nativeEvent || e,
            target: stageRef.current
        };
    };

    return (
        <div
            data-testid="stage"
            onMouseDown={(e) => props.onMouseDown && props.onMouseDown(wrapEvent(e))}
            onMouseMove={(e) => props.onMouseMove && props.onMouseMove(wrapEvent(e))}
            onMouseUp={(e) => props.onMouseUp && props.onMouseUp(wrapEvent(e))}
            onTouchStart={(e) => props.onTouchStart && props.onTouchStart(wrapEvent(e))}
            onTouchMove={(e) => props.onTouchMove && props.onTouchMove(wrapEvent(e))}
            onTouchEnd={(e) => props.onTouchEnd && props.onTouchEnd(wrapEvent(e))}
        >
            {props.children}
        </div>
    );
  });
  Stage.displayName = 'Stage';

  const Layer = ({ children }: { children: React.ReactNode }) => <div data-testid="layer">{children}</div>;
  Layer.displayName = 'Layer';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Rect = React.forwardRef((props: any, ref: any) => {
      const attrs = React.useRef({ x: 0, y: 0, width: 0, height: 0, visible: false });

      React.useImperativeHandle(ref, () => ({
          visible: (v: boolean) => { if (v !== undefined) attrs.current.visible = v; return attrs.current.visible; },
          width: (v: number) => { if (v !== undefined) attrs.current.width = v; return attrs.current.width; },
          height: (v: number) => { if (v !== undefined) attrs.current.height = v; return attrs.current.height; },
          x: (v: number) => { if (v !== undefined) attrs.current.x = v; return attrs.current.x; },
          y: (v: number) => { if (v !== undefined) attrs.current.y = v; return attrs.current.y; },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setAttrs: (newAttrs: any) => { Object.assign(attrs.current, newAttrs); },
          getLayer: () => ({ batchDraw: () => {} }),
      }));
      return <div data-testid="rect">Rect</div>;
  });
  Rect.displayName = 'Rect';

  return {
    Stage,
    Layer,
    Rect,
    Group: () => null,
    Text: () => null,
    Circle: () => null,
    Path: () => null,
    Line: () => null,
  };
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('Selection Optimization Benchmark', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 });
  });

  beforeEach(() => {
    (geometry.getRotatedRectPoints as jest.Mock).mockClear();
    mockPointerPosition = { x: 0, y: 0 };

    // Create 5,000 keys (10U x 1U), rotated 45 degrees
    // Radius ~5U.
    // Circle Y extent +/- 5U. (Range 10U)
    // AABB Y extent +/- 3.8U. (Range 7.6U)
    // Sweet spot gap: 1.2U on each side.

    const keys = [];
    const SPACING = 20; // Enough to not overlap circles horizontally
    const COUNT = 5000;

    for (let i = 0; i < COUNT; i++) {
        keys.push({
            id: `k${i}`,
            position: { x: i * SPACING, y: 0 },
            size: { w: 10, h: 1 },
            angle: 45,
            rotationCenter: { x: 5, y: 0.5 },
            legends: {},
            matrix: { row: 0, col: 0 },
            variant: 'rect'
        });
    }

    useStore.setState({
      project: {
        id: '1',
        name: 'Test Project',
        keys: keys as KeyData[],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      scale: 1,
      pan: { x: 0, y: 0 },
      gridSize: 1,
      selectedKeyIds: [],
    });
  });

  it('measures selection performance', () => {
    const { getByTestId } = render(<MainCanvas />);
    const stage = getByTestId('stage');

    // Assumed PIXELS_PER_U = 19.05 (based on constants.ts usually)
    // Key center Y (pixels) = 0.5 * 19.05 = 9.5.
    // Circle extends to +5 U = 5.5 U = 104.7 px.
    // AABB extends to +3.8 U = 4.3 U = 81.9 px.

    // We want to select a strip at Y = 95 px (approx 5 U).
    // This is between 82 and 105. Perfect.

    // Start X: 0
    // End X: Huge
    // Y: 90 to 100.

    mockPointerPosition = { x: 0, y: 90 };
    fireEvent.mouseDown(stage, { button: 0 });

    mockPointerPosition = { x: 2000000, y: 100 };
    fireEvent.mouseMove(stage);

    const start = performance.now();
    fireEvent.mouseUp(stage);
    const end = performance.now();

    console.log(`Selection time: ${end - start}ms`);
    console.log(`getRotatedRectPoints calls: ${(geometry.getRotatedRectPoints as jest.Mock).mock.calls.length}`);
  });
});
