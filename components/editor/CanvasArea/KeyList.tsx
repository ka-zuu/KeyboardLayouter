import React from 'react';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import KeyObject from './KeyObject';

interface KeyListProps {
    selectedKeysSet: Set<string>;
    onSelect: (id: string, multi: boolean) => void;
    onDragEnd: (id: string, x: number, y: number) => void;
}

const KeyList: React.FC<KeyListProps> = ({ selectedKeysSet, onSelect, onDragEnd }) => {
    const keys = useStore(useShallow(state => state.project.keys));

    return (
        <>
            {keys.map((key) => (
                <KeyObject
                    key={key.id}
                    id={key.id}
                    data={key}
                    isSelected={selectedKeysSet.has(key.id)}
                    onSelect={onSelect}
                    onDragEnd={onDragEnd}
                />
            ))}
        </>
    );
};

export default React.memo(KeyList);
