import React, { Profiler } from 'react';
import { render, act } from '@testing-library/react';
import MainCanvas from './MainCanvas';
import { useStore } from '@/store/useStore';
import { KeyData } from '@/types/mkd';

// Mock react-konva to avoid canvas issues in jsdom
jest.mock('react-konva', () => {
  const MockStage = ({ children }: { children: React.ReactNode }) => <div data-testid="stage">{children}</div>;
  MockStage.displayName = 'Stage';
  const MockLayer = ({ children }: { children: React.ReactNode }) => <div data-testid="layer">{children}</div>;
  MockLayer.displayName = 'Layer';
  const MockRect = () => <div data-testid="rect" />;
  MockRect.displayName = 'Rect';

  return {
    Stage: MockStage,
    Layer: MockLayer,
    Rect: MockRect,
  };
});

// Mock child components
jest.mock('./GridBackground', () => {
    const MockGridBackground = () => <div data-testid="grid-background" />;
    MockGridBackground.displayName = 'GridBackground';
    return MockGridBackground;
});

jest.mock('./KeyObject', () => {
    const MockKeyObject = () => <div data-testid="key-object" />;
    MockKeyObject.displayName = 'KeyObject';
    return MockKeyObject;
});

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
       const dummyKey: KeyData = {
           id: 'clip1',
           position: { x: 0, y: 0 },
           size: { w: 1, h: 1 },
           angle: 0,
           rotationCenter: { x: 0, y: 0 },
           legends: { top: '', bottom: '', left: '', right: '' },
           matrix: { row: 0, col: 0 }
       };
       useStore.setState({ clipboard: [dummyKey] });
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
