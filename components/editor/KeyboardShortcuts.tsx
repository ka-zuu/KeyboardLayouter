"use client";

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

const KeyboardShortcuts = () => {
    const {
        deleteSelectedKeys,
        copyKeys,
        pasteKeys,
        moveSelectedKeys,
        duplicateSelectedKeys,
        selectKeys,
        clearSelection
    } = useStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input field
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.tagName === 'SELECT' ||
                target.isContentEditable
            ) {
                return;
            }

            const isMod = e.metaKey || e.ctrlKey;
            const key = e.key.toLowerCase();

            // Undo / Redo
            if (isMod && key === 'z') {
                e.preventDefault();
                const { undo, redo } = useStore.temporal.getState();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                return;
            }
            if (isMod && key === 'y') {
                e.preventDefault();
                const { redo } = useStore.temporal.getState();
                redo();
                return;
            }

            // Delete / Backspace
            if (e.key === 'Delete' || e.key === 'Backspace') {
                deleteSelectedKeys();
                return;
            }

            // Escape to deselect
            if (e.key === 'Escape') {
                clearSelection();
                return;
            }

            // Select All
            if (isMod && key === 'a') {
                e.preventDefault();
                const { project } = useStore.getState();
                selectKeys(project.keys.map(k => k.id));
                return;
            }

            // Duplicate
            if (isMod && key === 'd') {
                e.preventDefault();
                duplicateSelectedKeys();
                return;
            }

            // Cut
            if (isMod && key === 'x') {
                e.preventDefault();
                copyKeys();
                deleteSelectedKeys();
                return;
            }

            // Copy / Paste
            if (isMod && key === 'c') {
                e.preventDefault();
                copyKeys();
                return;
            }

            if (isMod && key === 'v') {
                e.preventDefault();
                pasteKeys();
                return;
            }

            // Arrow Keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault(); // maintain scroll position

                const { gridSize } = useStore.getState();
                // If Shift is held, move by 1U, otherwise move by gridSize
                const delta = e.shiftKey ? 1 : gridSize;

                switch (e.key) {
                    case 'ArrowUp': moveSelectedKeys({ x: 0, y: -delta }); break;
                    case 'ArrowDown': moveSelectedKeys({ x: 0, y: delta }); break;
                    case 'ArrowLeft': moveSelectedKeys({ x: -delta, y: 0 }); break;
                    case 'ArrowRight': moveSelectedKeys({ x: delta, y: 0 }); break;
                }
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        deleteSelectedKeys,
        copyKeys,
        pasteKeys,
        moveSelectedKeys,
        duplicateSelectedKeys,
        selectKeys,
        clearSelection
    ]);

    return null;
};

export default KeyboardShortcuts;
