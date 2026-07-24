"use client";

import React from 'react';
import { useStore } from '@/store/useStore';
import { Trash2, Copy, Grid, MousePointerClick } from 'lucide-react';
import { KeyVariant } from '@/types/mkd';
import { Panel, SectionHeader, Field, InlineLabel, Input, NumberField, Select, Button } from '@/components/ui';

interface MatrixStartInputProps {
    row: number;
    onRowChange: (val: number) => void;
    col: number;
    onColChange: (val: number) => void;
    testIdSuffix?: string;
}

const MatrixStartInput: React.FC<MatrixStartInputProps> = ({ row, onRowChange, col, onColChange, testIdSuffix = '' }) => (
    <Field label="Matrix Auto-Assign Start" className="mb-4">
        <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
                <InlineLabel className="w-7 shrink-0">Row</InlineLabel>
                <NumberField
                    data-testid={`matrix-start-row${testIdSuffix}`}
                    value={row}
                    onChange={(e) => onRowChange(parseInt(e.target.value) || 0)}
                />
            </div>
            <div className="flex items-center gap-2">
                <InlineLabel className="w-7 shrink-0">Col</InlineLabel>
                <NumberField
                    data-testid={`matrix-start-col${testIdSuffix}`}
                    value={col}
                    onChange={(e) => onColChange(parseInt(e.target.value) || 0)}
                />
            </div>
        </div>
    </Field>
);

const RightSidebar = () => {
    const project = useStore(state => state.project);
    const selectedKeyIds = useStore(state => state.selectedKeyIds);
    const updateKey = useStore(state => state.updateKey);
    const deleteSelectedKeys = useStore(state => state.deleteSelectedKeys);
    const duplicateSelectedKeys = useStore(state => state.duplicateSelectedKeys);
    const autoAssignMatrix = useStore(state => state.autoAssignMatrix);

    const [startRow, setStartRow] = React.useState(0);
    const [startCol, setStartCol] = React.useState(0);

    const selectedKeySet = React.useMemo(() => new Set(selectedKeyIds), [selectedKeyIds]);
    const selectedKeys = React.useMemo(() => project.keys.filter((k) => selectedKeySet.has(k.id)), [project.keys, selectedKeySet]);
    const hasSelection = selectedKeys.length > 0;
    const singleSelection = selectedKeys.length === 1;
    const primaryKey = selectedKeys[0];

    // Auto-select text in the active input when primaryKey changes (e.g. via Tab navigation)
    React.useEffect(() => {
        if (!primaryKey) return;
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            (activeEl as HTMLInputElement).select();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [primaryKey?.id]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: string, nested?: string) => {
        if (!primaryKey) return;

        let value: string | number = e.target.value;
        const isNumber = e.target.type === 'number';

        if (isNumber) {
            value = parseFloat(value);
            if (isNaN(value)) value = 0;
        }

        if (nested) {
            if (field === 'position' && (nested === 'x' || nested === 'y')) {
                updateKey(primaryKey.id, {
                    position: { ...primaryKey.position, [nested]: value as number }
                });
            } else if (field === 'size' && (nested === 'w' || nested === 'h')) {
                updateKey(primaryKey.id, {
                    size: { ...primaryKey.size, [nested]: value as number }
                });
            } else if (field === 'matrix' && (nested === 'row' || nested === 'col')) {
                updateKey(primaryKey.id, {
                    matrix: { ...primaryKey.matrix, [nested]: value as number }
                });
            } else if (field === 'legends') {
                updateKey(primaryKey.id, {
                    legends: { ...primaryKey.legends, [nested]: value as string }
                });
            }
        } else {
            updateKey(primaryKey.id, { [field]: value });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!primaryKey) return;
        if (e.key === 'Tab') {
            e.preventDefault();
            const direction = e.shiftKey ? -1 : 1;

            // Sort keys by position (Y then X) to determine visual order
            const sortedKeys = [...project.keys].sort((a, b) => {
                const yDiff = a.position.y - b.position.y;
                if (Math.abs(yDiff) > 0.01) return yDiff; // Use epsilon for potential float inaccuracies
                return a.position.x - b.position.x;
            });

            const currentIndex = sortedKeys.findIndex(k => k.id === primaryKey.id);
            if (currentIndex === -1) return;

            let nextIndex = currentIndex + direction;
            // Wrap around
            if (nextIndex >= sortedKeys.length) nextIndex = 0;
            if (nextIndex < 0) nextIndex = sortedKeys.length - 1;

            const nextKey = sortedKeys[nextIndex];
            if (!nextKey) return;

            // Just selecting the key should preserve focus on the input
            // because React will reconcile the 'value' prop update but keep the DOM node if structure is same.
            // We use selectKey (singular) to ensure only one key is selected.
            useStore.getState().selectKey(nextKey.id, false);
        }
    };

    const handleDelete = () => {
        // Use the optimized single-action delete (O(N), one undo step)
        deleteSelectedKeys();
    };

    const handleDuplicate = () => {
        duplicateSelectedKeys();
    };

    // --- No selection: project tools -------------------------------------
    if (!hasSelection) {
        return (
            <Panel side="right" className="p-4">
                <SectionHeader title="Project" className="mb-3" />
                <div className="mb-6 flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-raised/30 px-3 py-6 text-center">
                    <MousePointerClick size={20} className="text-subtle" />
                    <p className="text-sm text-muted">Select a key to edit its properties.</p>
                </div>

                <SectionHeader title="Tools" className="mb-3" />

                <MatrixStartInput
                    row={startRow}
                    onRowChange={setStartRow}
                    col={startCol}
                    onColChange={setStartCol}
                />

                <Button variant="subtle" className="w-full" onClick={() => autoAssignMatrix(undefined, { startRow, startCol })}>
                    <Grid size={16} />
                    Auto-assign Matrix (All)
                </Button>
            </Panel>
        );
    }

    // --- Multi selection -------------------------------------------------
    if (!singleSelection) {
        return (
            <Panel side="right" className="p-4">
                <SectionHeader title="Selection" className="mb-3" />
                <p className="mb-4 text-sm text-muted">{selectedKeys.length} items selected</p>

                <div className="space-y-3">
                    <MatrixStartInput
                        row={startRow}
                        onRowChange={setStartRow}
                        col={startCol}
                        onColChange={setStartCol}
                        testIdSuffix="-selection"
                    />

                    <Button
                        variant="subtle"
                        className="w-full"
                        onClick={() => autoAssignMatrix(selectedKeyIds, { startRow, startCol })}
                        title="Auto-assign Matrix to selected keys"
                    >
                        <Grid size={16} />
                        Auto-assign Matrix
                    </Button>

                    <div className="flex gap-2">
                        <Button variant="subtle" className="flex-1" onClick={handleDuplicate}>
                            <Copy size={16} /> Duplicate
                        </Button>
                        <Button variant="danger" className="flex-1" onClick={handleDelete}>
                            <Trash2 size={16} /> Delete
                        </Button>
                    </div>
                </div>
            </Panel>
        );
    }

    if (!primaryKey) return null;

    // --- Single selection: properties ------------------------------------
    return (
        <Panel side="right" className="overflow-y-auto p-4">
            <SectionHeader title="Properties" className="mb-4" />

            <div className="space-y-4">
                {/* Legends */}
                <Field label="Legends">
                    <div className="grid grid-cols-2 gap-2">
                        <Input
                            placeholder="Top"
                            value={primaryKey.legends?.top || ''}
                            onChange={(e) => handleInputChange(e, 'legends', 'top')}
                            onKeyDown={handleKeyDown}
                        />
                        <Input
                            placeholder="Bottom"
                            value={primaryKey.legends?.bottom || ''}
                            onChange={(e) => handleInputChange(e, 'legends', 'bottom')}
                            onKeyDown={handleKeyDown}
                        />
                        <Input
                            placeholder="Left"
                            value={primaryKey.legends?.left || ''}
                            onChange={(e) => handleInputChange(e, 'legends', 'left')}
                            onKeyDown={handleKeyDown}
                        />
                        <Input
                            placeholder="Right"
                            value={primaryKey.legends?.right || ''}
                            onChange={(e) => handleInputChange(e, 'legends', 'right')}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                </Field>

                <hr className="border-border" />

                {/* Variant Selector */}
                <Field label="Shape">
                    <Select
                        value={primaryKey.variant || 'rect'}
                        onChange={(e) => updateKey(primaryKey.id, { variant: e.target.value as KeyVariant })}
                        onKeyDown={handleKeyDown}
                    >
                        <option value="rect">Rectangle</option>
                        <option value="iso_enter">ISO Enter</option>
                        <option value="stepped_caps">Stepped Caps (TBD)</option>
                    </Select>
                </Field>

                <hr className="border-border" />

                {/* Position */}
                <Field label="Position (U)">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                            <InlineLabel className="w-4 shrink-0">X</InlineLabel>
                            <NumberField
                                step="0.25"
                                unit="U"
                                value={primaryKey.position.x}
                                onChange={(e) => handleInputChange(e, 'position', 'x')}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <InlineLabel className="w-4 shrink-0">Y</InlineLabel>
                            <NumberField
                                step="0.25"
                                unit="U"
                                value={primaryKey.position.y}
                                onChange={(e) => handleInputChange(e, 'position', 'y')}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                    </div>
                </Field>

                {/* Size */}
                <Field label="Size (U)">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                            <InlineLabel className="w-4 shrink-0">W</InlineLabel>
                            <NumberField
                                step="0.25"
                                unit="U"
                                value={primaryKey.size.w}
                                onChange={(e) => handleInputChange(e, 'size', 'w')}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <InlineLabel className="w-4 shrink-0">H</InlineLabel>
                            <NumberField
                                step="0.25"
                                unit="U"
                                value={primaryKey.size.h}
                                onChange={(e) => handleInputChange(e, 'size', 'h')}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                    </div>
                </Field>

                {/* Rotation */}
                <Field label="Rotation">
                    <NumberField
                        unit="°"
                        value={primaryKey.angle}
                        onChange={(e) => handleInputChange(e, 'angle')}
                        onKeyDown={handleKeyDown}
                    />
                </Field>

                <hr className="border-border" />

                {/* Matrix */}
                <Field label="Matrix">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                            <InlineLabel className="w-8 shrink-0">Row</InlineLabel>
                            <NumberField
                                value={primaryKey.matrix.row}
                                onChange={(e) => handleInputChange(e, 'matrix', 'row')}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <InlineLabel className="w-8 shrink-0">Col</InlineLabel>
                            <NumberField
                                value={primaryKey.matrix.col}
                                onChange={(e) => handleInputChange(e, 'matrix', 'col')}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                    </div>
                </Field>

                <hr className="border-border" />

                <div className="flex gap-2">
                    <Button variant="subtle" className="flex-1" onClick={handleDuplicate}>
                        <Copy size={16} /> Duplicate
                    </Button>
                    <Button variant="danger" className="flex-1" onClick={handleDelete}>
                        <Trash2 size={16} /> Delete
                    </Button>
                </div>
            </div>
        </Panel>
    );
};

export default RightSidebar;
