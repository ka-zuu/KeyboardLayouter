import React from 'react';
import { render } from '@testing-library/react';
import MainCanvas from '@/components/editor/CanvasArea/MainCanvas';
import { useStore } from '@/store/useStore';
import KeyList from '../components/editor/CanvasArea/KeyList';

// Mock KeyList
jest.mock('../components/editor/CanvasArea/KeyList', () => {
    const React = require('react');
    return jest.fn(() => <div data-testid="key-list" />);
});

// Mock GridBackground
jest.mock('../components/editor/CanvasArea/GridBackground', () => () => <div>Grid</div>);

// Mock Konva components
jest.mock('react-konva', () => {
  const React = require('react');
  const Stage = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
        getPointerPosition: () => ({ x: props.mockPointerX || 100, y: props.mockPointerY || 100 }),
        getRelativePointerPosition: () => ({ x: props.mockPointerX || 100, y: props.mockPointerY || 100 }),
        x: () => 0,
        y: () => 0,
        scaleX: () => 1,
        width: () => 800,
        height: () => 600,
        findOne: () => null,
    }));
    return (
        <div
            data-testid="stage"
            onMouseDown={props.onMouseDown}
            onMouseMove={props.onMouseMove}
            onMouseUp={props.onMouseUp}
        >
            {props.children}
        </div>
    );
  });
  Stage.displayName = 'Stage';

  return {
    Stage,
    Layer: jest.fn(({ children }) => <div data-testid="layer">{children}</div>),
    Rect: jest.fn(() => <div data-testid="rect">Rect</div>),
    Group: jest.fn(({ children }) => <div>Group{children}</div>),
    Text: jest.fn(() => <div>Text</div>),
    Circle: jest.fn(() => <div>Circle</div>),
    Path: jest.fn(() => <div>Path</div>),
    Line: jest.fn(() => <div>Line</div>),
  };
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

describe('Selection Performance', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 });
  });

  beforeEach(() => {
    (KeyList as jest.Mock).mockClear();
    useStore.setState({
      project: {
        id: '1',
        name: 'Test Project',
        keys: [
            { id: 'k1', position: { x: 0, y: 0 }, size: { w: 1, h: 1 }, angle: 0, rotationCenter: { x: 0, y: 0 }, legends: {}, matrix: { row: 0, col: 0 }, variant: 'rect' }
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      savedProjects: {},
      scale: 1,
      pan: { x: 0, y: 0 },
      snapEnabled: true,
      gridSize: 1,
      selectedKeyIds: [],
      clipboard: [],
    });
  });

  it('should render KeyList', async () => {
    const { getByTestId } = render(<MainCanvas />);

    expect(KeyList).toHaveBeenCalledTimes(1);
    expect(getByTestId('key-list')).toBeInTheDocument();
  });
});
