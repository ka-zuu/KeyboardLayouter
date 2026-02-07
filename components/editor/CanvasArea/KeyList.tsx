import React from 'react';
import KeyObject from './KeyObject';

interface KeyListProps {
    keyIds: string[];
    selectedKeysSet: Set<string>;
    onSelect: (id: string, multi: boolean) => void;
    onDragEnd: (id: string, x: number, y: number) => void;
}

const KeyList: React.FC<KeyListProps> = ({ keyIds, selectedKeysSet, onSelect, onDragEnd }) => {
    return (
        <>
            {keyIds.map((id) => (
                <KeyObject
                    key={id}
                    id={id}
                    isSelected={selectedKeysSet.has(id)}
                    onSelect={onSelect}
                    onDragEnd={onDragEnd}
                />
            ))}
        </>
    );
};

export default React.memo(KeyList);
