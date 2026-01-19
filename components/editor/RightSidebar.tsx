"use client";

import React from 'react';
import { useStore } from '@/store/useStore';
import { Trash2, Copy, Grid } from 'lucide-react';

const RightSidebar = () => {
    const { project, selectedKeyIds, updateKey, removeKey, addKey, autoAssignMatrix } = useStore();

    const selectedKeys = project.keys.filter((k) => selectedKeyIds.includes(k.id));
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
            // Handle nested updates like position.x
            updateKey(primaryKey.id, {
                [field]: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ...((primaryKey as any)[field]),
                    [nested]: value,
                },
            });
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
        selectedKeyIds.forEach((id) => removeKey(id));
    };

    const handleDuplicate = () => {
        selectedKeys.forEach((key) => {
            addKey({
                ...key,
                position: { x: key.position.x + 0.5, y: key.position.y + 0.5 },
            });
        });
    };

    if (!hasSelection) {
        return (
            <div className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col p-4 text-gray-300">
                <h2 className="font-semibold mb-4 text-white">Project Settings</h2>
                <div className="space-y-4">
                    {/* Project Name removed as it is actionable in TopBar */}
                    <div className="text-sm text-gray-500 mt-4">
                        Select a key to edit properties.
                    </div>
                </div>

                <hr className="border-gray-800 my-4" />

                <h2 className="font-semibold mb-4 text-white">Tools</h2>
                <button
                    onClick={() => autoAssignMatrix()} // all keys
                    className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 px-3 rounded flex items-center justify-center gap-2 text-sm transition-colors"
                >
                    <Grid size={16} />
                    Auto-assign Matrix (All)
                </button>
            </div>
        );
    }

    if (!singleSelection) {
        return (
            <div className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col p-4 text-gray-300">
                <h2 className="font-semibold mb-4 text-white">Selection</h2>
                <p>{selectedKeys.length} items selected</p>

                <div className="mt-4 space-y-2">
                    <button
                        onClick={() => autoAssignMatrix(selectedKeyIds)}
                        className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 px-3 rounded flex items-center justify-center gap-2 text-sm transition-colors"
                        title="Auto-assign Matrix to selected keys"
                    >
                        <Grid size={16} />
                        Auto-assign Matrix
                    </button>

                    <div className="flex gap-2">
                        <button onClick={handleDuplicate} className="flex-1 bg-gray-800 hover:bg-gray-700 p-2 rounded flex justify-center items-center gap-2 text-sm"><Copy size={16} /> Duplicate</button>
                        <button onClick={handleDelete} className="flex-1 bg-red-900/50 hover:bg-red-900 p-2 rounded flex justify-center text-red-200 items-center gap-2 text-sm"><Trash2 size={16} /> Delete</button>
                    </div>
                </div>
            </div>
        );
    }

    if (!primaryKey) return null;

    return (
        <div className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col p-4 text-gray-300 overflow-y-auto">
            <h2 className="font-semibold mb-4 text-white">Properties</h2>

            <div className="space-y-4">
                {/* Legends */}
                <div>
                    <label className="text-xs text-gray-500 uppercase block mb-1">Legend</label>
                    <input
                        className="w-full bg-gray-800 text-white rounded px-2 py-1 border border-gray-700 focus:border-blue-500 outline-none"
                        value={primaryKey.visualLegend}
                        onChange={(e) => handleInputChange(e, 'visualLegend')}
                        onKeyDown={handleKeyDown}
                    />
                </div>

                <hr className="border-gray-800" />

                {/* Variant Selector */}
                <div>
                    <label className="text-xs text-gray-500 uppercase block mb-1">Shape</label>
                    <select
                        className="w-full bg-gray-800 text-white rounded px-2 py-1 border border-gray-700 text-sm"
                        value={primaryKey.variant || 'rect'}
                        onChange={(e) => updateKey(primaryKey.id, { variant: e.target.value as any })}
                        onKeyDown={handleKeyDown}
                    >
                        <option value="rect">Rectangle</option>
                        <option value="iso_enter">ISO Enter</option>
                        <option value="stepped_caps">Stepped Caps (TBD)</option>
                    </select>
                </div>

                <hr className="border-gray-800" />

                {/* Position */}
                <div>
                    <label className="text-xs text-gray-500 uppercase block mb-1">Position (U)</label>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <span className="text-xs text-gray-600 mr-1">X</span>
                            <input
                                type="number"
                                step="0.25"
                                className="w-full bg-gray-800 text-white rounded px-2 py-1 border border-gray-700"
                                value={primaryKey.position.x}
                                onChange={(e) => handleInputChange(e, 'position', 'x')}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <div>
                            <span className="text-xs text-gray-600 mr-1">Y</span>
                            <input
                                type="number"
                                step="0.25"
                                className="w-full bg-gray-800 text-white rounded px-2 py-1 border border-gray-700"
                                value={primaryKey.position.y}
                                onChange={(e) => handleInputChange(e, 'position', 'y')}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                    </div>
                </div>

                {/* Size */}
                <div>
                    <label className="text-xs text-gray-500 uppercase block mb-1">Size (U)</label>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <span className="text-xs text-gray-600 mr-1">W</span>
                            <input
                                type="number"
                                step="0.25"
                                className="w-full bg-gray-800 text-white rounded px-2 py-1 border border-gray-700"
                                value={primaryKey.size.w}
                                onChange={(e) => handleInputChange(e, 'size', 'w')}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <div>
                            <span className="text-xs text-gray-600 mr-1">H</span>
                            <input
                                type="number"
                                step="0.25"
                                className="w-full bg-gray-800 text-white rounded px-2 py-1 border border-gray-700"
                                value={primaryKey.size.h}
                                onChange={(e) => handleInputChange(e, 'size', 'h')}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                    </div>
                </div>

                {/* Rotation */}
                <div>
                    <label className="text-xs text-gray-500 uppercase block mb-1">Rotation (°)</label>
                    <input
                        type="number"
                        className="w-full bg-gray-800 text-white rounded px-2 py-1 border border-gray-700"
                        value={primaryKey.angle}
                        onChange={(e) => handleInputChange(e, 'angle')}
                        onKeyDown={handleKeyDown}
                    />
                </div>

                <hr className="border-gray-800" />

                {/* Matrix */}
                <div>
                    <label className="text-xs text-gray-500 uppercase block mb-1">Matrix</label>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <span className="text-xs text-gray-600 mr-1">Row</span>
                            <input
                                type="number"
                                className="w-full bg-gray-800 text-white rounded px-2 py-1 border border-gray-700"
                                value={primaryKey.matrix.row}
                                onChange={(e) => handleInputChange(e, 'matrix', 'row')}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <div>
                            <span className="text-xs text-gray-600 mr-1">Col</span>
                            <input
                                type="number"
                                className="w-full bg-gray-800 text-white rounded px-2 py-1 border border-gray-700"
                                value={primaryKey.matrix.col}
                                onChange={(e) => handleInputChange(e, 'matrix', 'col')}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-gray-800" />

                <div className="flex gap-2 mt-2">
                    <button onClick={handleDuplicate} className="flex-1 bg-gray-800 hover:bg-gray-700 p-2 rounded flex justify-center text-sm items-center gap-2"><Copy size={16} /> Duplicate</button>
                    <button onClick={handleDelete} className="flex-1 bg-red-900/50 hover:bg-red-900 p-2 rounded flex justify-center text-red-200 text-sm items-center gap-2"><Trash2 size={16} /> Delete</button>
                </div>

            </div>
        </div>
    );
};

export default RightSidebar;
