import React, { memo } from 'react';
import KeyObject from './KeyObject';
import { KeyData } from '@/types/mkd';

interface KeyListProps {
  keys: KeyData[];
  selectedKeysSet: Set<string>;
  onSelect: (id: string, multi: boolean) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

const KeyList: React.FC<KeyListProps> = ({ keys, selectedKeysSet, onSelect, onDragEnd }) => {
  return (
    <>
      {keys.map((key) => (
        <KeyObject
          key={key.id}
          data={key}
          isSelected={selectedKeysSet.has(key.id)}
          onSelect={onSelect}
          onDragEnd={onDragEnd}
        />
      ))}
    </>
  );
};

export default memo(KeyList);
