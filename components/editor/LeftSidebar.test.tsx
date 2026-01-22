import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
// Mock uuid before imports that use it
jest.mock('uuid', () => ({
    v4: () => 'test-uuid-' + Math.random(),
}));

import LeftSidebar from './LeftSidebar';
import { useStore } from '@/store/useStore';

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

// Mock dataTransfer for drag events (not used in current tests but useful if we test drag)
// const mockDataTransfer = {
//     setData: jest.fn(),
//     effectAllowed: 'none',
// };

describe('LeftSidebar', () => {
    beforeEach(() => {
        const initialState = useStore.getState();
        useStore.setState({
            savedProjects: {},
            project: { ...initialState.project, keys: [], name: 'Test Project' },
            scale: 1,
            pan: { x: 0, y: 0 }
        });
    });

    it('renders basic elements', () => {
        render(<LeftSidebar />);
        expect(screen.getByText('Add Keys')).toBeInTheDocument();
        expect(screen.getByText('Projects')).toBeInTheDocument();
        expect(screen.getByText(/Test Project/)).toBeInTheDocument();
    });

    it('adds a key when preset is clicked', () => {
        render(<LeftSidebar />);
        const initialKeys = useStore.getState().project.keys.length;

        const preset1U = screen.getByText('1U');
        fireEvent.click(preset1U);

        expect(useStore.getState().project.keys.length).toBe(initialKeys + 1);
    });

    it('updates when project name changes', () => {
        render(<LeftSidebar />);
        expect(screen.getByText(/Test Project/)).toBeInTheDocument();

        act(() => {
            useStore.getState().setProjectName('New Name');
        });

        expect(screen.getByText(/New Name/)).toBeInTheDocument();
    });

});
