import React from 'react';
import { render, act } from '@testing-library/react';
import MainCanvas from '../components/editor/CanvasArea/MainCanvas';
import { useStore } from '../store/useStore';

// Mock Konva
jest.mock('react-konva', () => ({
  Stage: jest.fn(({ children }) => <div data-testid="stage">{children}</div>),
  Layer: jest.fn(({ children }) => <div data-testid="layer">{children}</div>),
  Rect: jest.fn(() => <div />),
  Group: jest.fn(({ children }) => <div data-testid="group">{children}</div>),
  Text: jest.fn(() => <div />),
  Circle: jest.fn(() => <div />),
  Path: jest.fn(() => <div />),
  Line: jest.fn(() => <div />),
}));

// Mock KeyList to track renders
// Use relative path to avoid alias issues in this test
jest.mock('../components/editor/CanvasArea/KeyList', () => {
  const MockKeyList = jest.fn(() => <div data-testid="key-list" />);

  return {
    __esModule: true,
    default: React.memo(MockKeyList),
  };
});

import KeyList from '../components/editor/CanvasArea/KeyList';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('MainCanvas Pan Optimization', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 });
  });

  beforeEach(() => {
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
             legends: {},
             matrix: { row: 0, col: 0 },
             variant: 'rect'
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
    // @ts-expect-error accessing internals of memoized component for testing
    KeyList.type.mockClear();
  });

  it('should NOT re-render KeyList when pan changes', async () => {
    // @ts-expect-error accessing internals of memoized component for testing
    const mockKeyListImpl = KeyList.type;

    render(<MainCanvas />);

    // Initial render
    expect(mockKeyListImpl).toHaveBeenCalledTimes(1);

    // Change Pan
    await act(async () => {
      useStore.getState().setPan({ x: 10, y: 10 });
    });

    // MainCanvas re-renders, but KeyList should NOT re-render
    expect(mockKeyListImpl).toHaveBeenCalledTimes(1);
  });
});
