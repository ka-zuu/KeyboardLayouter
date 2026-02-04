import React from 'react';
import { render, act } from '@testing-library/react';
import MainCanvas from '@/components/editor/CanvasArea/MainCanvas';
import { useStore } from '@/store/useStore';
import { Stage } from 'react-konva';

// Mock Konva
jest.mock('react-konva', () => ({
  Stage: jest.fn(({ children }) => <div data-testid="stage">{children}</div>),
  Layer: jest.fn(({ children }) => <div data-testid="layer">{children}</div>),
  Rect: jest.fn(() => <div />),
  Group: jest.fn(({ children }) => <div>{children}</div>),
  Text: jest.fn(() => <div />),
  Circle: jest.fn(() => <div />),
  Path: jest.fn(() => <div />),
  Line: jest.fn(() => <div />),
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

// Mock container dimensions
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 });

// Mock KeyList and track renders
let keyListRenderCount = 0;
jest.mock('../components/editor/CanvasArea/KeyList', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    const MockKeyList = React.memo(() => {
        keyListRenderCount++;
        return <div data-testid="key-list">KeyList</div>;
    });
    MockKeyList.displayName = 'MockKeyList';
    return MockKeyList;
});

describe('KeyList Integration', () => {
  beforeEach(() => {
    keyListRenderCount = 0;
    useStore.setState({
      project: {
        id: '1',
        name: 'Test Project',
        keys: [{
             id: 'k1',
             position: { x: 0, y: 0 },
             size: { w: 1, h: 1 },
             angle: 0,
             rotationCenter: { x: 0, y: 0 },
             legends: { top: '', bottom: '', left: '', right: '' },
             matrix: { row: 0, col: 0 }
        }],
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

  it('should NOT re-render KeyList when pan updates', async () => {
    render(<MainCanvas />);

    // Initial Render
    expect(keyListRenderCount).toBe(1);

    // Update Pan
    await act(async () => {
       useStore.getState().setPan({ x: 100, y: 100 });
    });

    // MainCanvas should re-render (Stage updates), but KeyList should NOT
    expect(Stage).toHaveBeenCalled(); // Just to confirm MainCanvas updated
    expect(keyListRenderCount).toBe(1);
  });
});
