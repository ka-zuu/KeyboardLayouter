"use client";

import React, { useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import KeyObject from './KeyObject';
import { KeyData } from '@/types/mkd';

const KeyList = () => {
    const projectKeys = useStore(useShallow(state => state.project.keys));
    const selectedKeyIds = useStore(useShallow(state => state.selectedKeyIds));
    const selectKey = useStore(state => state.selectKey);

    const selectedKeysSet = React.useMemo(() => new Set(selectedKeyIds), [selectedKeyIds]);

    const handleKeyDragEnd = useCallback((id: string, x: number, y: number) => {
        const { selectedKeyIds, project, updateKeys, updateKey } = useStore.getState();
        if (selectedKeyIds.length > 1 && selectedKeyIds.includes(id)) {
            // Performance optimization: Create Map for O(1) lookup
            const keysById = new Map(project.keys.map(k => [k.id, k]));
            const draggedKey = keysById.get(id);
            if (!draggedKey) return;

            const deltaX = x - draggedKey.position.x;
            const deltaY = y - draggedKey.position.y;

            type UpdateType = { id: string; data: Partial<KeyData> };

            const updates = selectedKeyIds.map((selectedId): UpdateType | null => {
                const key = keysById.get(selectedId);
                if (!key) return null;
                return {
                    id: selectedId,
                    data: {
                        position: {
                            x: key.position.x + deltaX,
                            y: key.position.y + deltaY
                        }
                    }
                };
            }).filter((u): u is UpdateType => u !== null);

            updateKeys(updates);
        } else {
            updateKey(id, { position: { x, y } });
        }
    }, []);

    return (
        <>
            {projectKeys.map((key) => (
                <KeyObject
                    key={key.id}
                    data={key}
                    isSelected={selectedKeysSet.has(key.id)}
                    onSelect={selectKey}
                    onDragEnd={handleKeyDragEnd}
                />
            ))}
        </>
    );
};

export default React.memo(KeyList);
