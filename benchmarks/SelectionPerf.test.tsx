import React from 'react';
import { render } from '@testing-library/react';
import MainCanvas from '@/components/editor/CanvasArea/MainCanvas';
import { useStore } from '@/store/useStore';
import KeyList from '../components/editor/CanvasArea/KeyList';

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

// Mock Konva components
jest.mock('react-konva', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');

  interface MockStageProps {
      mockPointerX?: number;
      mockPointerY?: number;
      onMouseDown?: React.MouseEventHandler;
      onMouseMove?: React.MouseEventHandler;
      onMouseUp?: React.MouseEventHandler;
      children?: React.ReactNode;
  }

  const Stage = React.forwardRef((props: MockStageProps, ref: React.ForwardedRef<unknown>) => {
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

  const Layer = ({ children }: { children: React.ReactNode }) => <div data-testid="layer">{children}</div>;
  Layer.displayName = 'Layer';

  const Group = ({ children }: { children: React.ReactNode }) => <div>Group{children}</div>;
  Group.displayName = 'Group';

  const Rect = () => <div data-testid="rect">Rect</div>;
  Rect.displayName = 'Rect';

  const Text = () => <div>Text</div>;
  Text.displayName = 'Text';

  const Circle = () => <div>Circle</div>;
  Circle.displayName = 'Circle';

  const Path = () => <div>Path</div>;
  Path.displayName = 'Path';

  const Line = () => <div>Line</div>;
  Line.displayName = 'Line';

  return {
    Stage,
    Layer: jest.fn(Layer),
    Rect: jest.fn(Rect),
    Group: jest.fn(Group),
    Text: jest.fn(Text),
    Circle: jest.fn(Circle),
    Path: jest.fn(Path),
    Line: jest.fn(Line),
  };
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('Selection Performance', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 });
  });

  beforeEach(() => {
    (KeyList as unknown as jest.Mock).mockClear();
    useStore.setState({
      project: {
        id: '1',
        name: 'Test Project',
        keys: [
            { id: 'k1', position: { x: 0, y: 0 }, size: { w: 1, h: 1 }, angle: 0, rotationCenter: { x: 0, y: 0 }, legends: { top: '', bottom: '', left: '', right: '' }, matrix: { row: 0, col: 0 }, variant: 'rect' }
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
