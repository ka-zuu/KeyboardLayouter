"use client";

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

const KeyboardShortcuts = () => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input field
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            // Undo / Redo
            // Cmd+Z or Ctrl+Z -> Undo
            // Cmd+Shift+Z or Ctrl+Shift+Z -> Redo
            // Ctrl+Y -> Redo (Windows standard)
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    useStore.temporal.getState().redo();
                } else {
                    useStore.temporal.getState().undo();
                }
                return;
            }

            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                useStore.temporal.getState().redo();
                return;
            }

            // Delete / Backspace
            if (e.key === 'Delete' || e.key === 'Backspace') {
                useStore.getState().deleteSelectedKeys();
                return;
            }

            // Arrow Keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault(); // maintain scroll position

                // Use current grid size
                const store = useStore.getState();
                const gridSize = store.gridSize;
                const delta = e.shiftKey ? 1 : gridSize;
                const moveSelectedKeys = store.moveSelectedKeys;

                switch (e.key) {
                    case 'ArrowUp': moveSelectedKeys({ x: 0, y: -delta }); break;
                    case 'ArrowDown': moveSelectedKeys({ x: 0, y: delta }); break;
                    case 'ArrowLeft': moveSelectedKeys({ x: -delta, y: 0 }); break;
                    case 'ArrowRight': moveSelectedKeys({ x: delta, y: 0 }); break;
                }
                return;
            }

            // Copy / Paste (Cmd+C, Cmd+V or Ctrl+C, Ctrl+V)
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                useStore.getState().copyKeys();
                return;
            }

            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
                e.preventDefault();
                useStore.getState().pasteKeys();
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return null;
};

export default KeyboardShortcuts;
