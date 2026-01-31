import React, { Profiler } from 'react';
import { render, act } from '@testing-library/react';
import MainCanvas from './MainCanvas';
import { useStore } from '@/store/useStore';

// Mock react-konva to avoid canvas issues in jsdom
jest.mock('react-konva', () => ({
  Stage: ({ children }: { children: React.ReactNode }) => <div data-testid="stage">{children}</div>,
  Layer: ({ children }: { children: React.ReactNode }) => <div data-testid="layer">{children}</div>,
  Rect: () => <div data-testid="rect" />,
}));

// Mock child components
jest.mock('./GridBackground', () => () => <div data-testid="grid-background" />);
jest.mock('./KeyObject', () => () => <div data-testid="key-object" />);

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('MainCanvas Performance', () => {
  const onRender = jest.fn();

  beforeEach(() => {
    onRender.mockClear();
    useStore.setState({
      project: {
        id: 'test',
        name: 'Test Project',
        keys: [],
        createdAt: 0,
        updatedAt: 0,
      },
      scale: 1,
      pan: { x: 0, y: 0 },
      selectedKeyIds: [],
      gridSize: 1,
      snapEnabled: true,
      clipboard: []
    });
  });

  it('re-renders unnecessarily when unrelated store state changes', async () => {
    render(
      <Profiler id="MainCanvas" onRender={onRender}>
        <MainCanvas />
      </Profiler>
    );

    // Initial render
    expect(onRender).toHaveBeenCalled();
    const initialRenderCount = onRender.mock.calls.length;

    // Trigger unrelated state change (clipboard)
    await act(async () => {
       useStore.setState({ clipboard: [{ id: 'clip1' } as any] });
    });

    // Trigger unrelated project metadata change (name)
    await act(async () => {
       useStore.getState().setProjectName('New Name');
    });

    // Check if re-rendered
    // Optimized behavior: It should NOT re-render because we use selectors.
    expect(onRender.mock.calls.length).toBe(initialRenderCount);

    console.log(`Renders: ${onRender.mock.calls.length} (Initial: ${initialRenderCount})`);
  });
});
