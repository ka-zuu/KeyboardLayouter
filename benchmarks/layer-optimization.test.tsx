
import React from 'react';
import { render } from '@testing-library/react';
import MainCanvas from '../components/editor/CanvasArea/MainCanvas';
import { useStore } from '../store/useStore';

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
    const MockGrid = () => <div data-testid="grid-background">Grid</div>;
    MockGrid.displayName = 'GridBackground';
    return MockGrid;
});

// Mock Konva components
jest.mock('react-konva', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');

  const Stage = ({ children }: { children: React.ReactNode }) => <div data-testid="stage">{children}</div>;
  Stage.displayName = 'Stage';

  const Layer = ({ children }: { children: React.ReactNode }) => <div data-testid="layer">{children}</div>;
  Layer.displayName = 'Layer';

  const Rect = () => <div data-testid="selection-rect">Rect</div>;
  Rect.displayName = 'Rect';

  return {
    Stage: jest.fn(Stage),
    Layer: jest.fn(Layer),
    Rect: jest.fn(Rect),
  };
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('Layer Optimization', () => {
  beforeAll(() => {
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
    });
  });

  it('should use separate layers for Grid, Keys, and Selection', () => {
    const { getAllByTestId, getByTestId } = render(<MainCanvas />);

    const layers = getAllByTestId('layer');
    // We expect 3 layers now (Optimization goal)
    // Current implementation has 1 layer, so this test will fail initially.

    if (layers.length === 1) {
        // Current state: 1 layer contains everything
        const layer = layers[0];
        expect(layer).toContainElement(getByTestId('grid-background'));
        expect(layer).toContainElement(getByTestId('key-list'));
        expect(layer).toContainElement(getByTestId('selection-rect'));
        console.log("Verified current state: Single Layer found.");
        throw new Error("Optimization not implemented: Expected 3 layers, found 1.");
    } else {
        expect(layers).toHaveLength(3);
        expect(layers[0]).toContainElement(getByTestId('grid-background'));
        expect(layers[1]).toContainElement(getByTestId('key-list'));
        expect(layers[2]).toContainElement(getByTestId('selection-rect'));
    }
  });
});
