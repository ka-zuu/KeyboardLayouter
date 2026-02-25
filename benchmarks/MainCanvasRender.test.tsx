import React from 'react';
import { render, act } from '@testing-library/react';
import MainCanvas from '@/components/editor/CanvasArea/MainCanvas';
import { useStore } from '@/store/useStore';
import { Stage } from 'react-konva';

// Mock Konva components
jest.mock('react-konva', () => ({
  Stage: jest.fn(({ children }) => <div data-testid="stage">{children}</div>),
  Layer: jest.fn(({ children }) => <div>Layer{children}</div>),
  Rect: jest.fn(() => <div>Rect</div>),
  Group: jest.fn(({ children }) => <div>Group{children}</div>),
  Text: jest.fn(() => <div>Text</div>),
  Circle: jest.fn(() => <div>Circle</div>),
  Path: jest.fn(() => <div>Path</div>),
  Line: jest.fn(() => <div>Line</div>),
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('MainCanvas Performance', () => {
  beforeAll(() => {
    // Mock container dimensions
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 });
  });

  beforeEach(() => {
    useStore.setState({
      project: {
        id: '1',
        name: 'Test Project',
        keys: [],
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

  it('should NOT re-render Stage when project name changes', async () => {
    render(<MainCanvas />);

    // Initial render should have called Stage
    expect(Stage).toHaveBeenCalled();
    const initialCallCount = (Stage as unknown as jest.Mock).mock.calls.length;

    // Change Project Name
    await act(async () => {
      useStore.getState().setProjectName('New Name');
    });

    // Expect Stage NOT to have re-rendered
    expect(Stage).toHaveBeenCalledTimes(initialCallCount);
  });
});
