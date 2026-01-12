"use client";

import React from 'react';
import { useStore } from '@/store/useStore';
import { useStore as useZustandStore } from 'zustand';
import { Plus, Download, Upload, RotateCcw, RotateCw } from 'lucide-react';

const TopBar = () => {
    const { project, addKey, importProject } = useStore();
    // Use the zustand helper to consume the temporal store
    const { undo, redo, pastStates, futureStates } = useZustandStore(useStore.temporal, (state: any) => state);

    const handleAddKey = () => {
        addKey({
            position: { x: 0, y: 0 },
            size: { w: 1, h: 1 },
            angle: 0,
            rotationCenter: { x: 0, y: 0 },
            visualLegend: 'A',
            matrix: { row: 0, col: 0 },
        });
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(project, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name.replace(/\s+/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                // Basic validation
                if (json.keys && Array.isArray(json.keys)) {
                    importProject(json);
                    // clear history on import?
                    useStore.temporal.getState().clear();
                } else {
                    alert('Invalid project file');
                }
            } catch (err) {
                console.error(err);
                alert('Failed to parse JSON');
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    };

    return (
        <div className="h-14 bg-gray-900 text-white flex items-center justify-between px-4 border-b border-gray-800">
            <div className="flex items-center gap-4">
                <h1 className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    MKD
                </h1>
                <span className="text-gray-500 text-sm">{project.name}</span>
            </div>

            <div className="flex items-center gap-2">
                {/* History Control */}
                <div className="flex items-center bg-gray-800 rounded mr-2">
                    <button
                        onClick={() => undo()}
                        disabled={pastStates.length === 0}
                        className="p-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                        title="Undo"
                    >
                        <RotateCcw size={16} />
                    </button>
                    <button
                        onClick={() => redo()}
                        disabled={futureStates.length === 0}
                        className="p-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                        title="Redo"
                    >
                        <RotateCw size={16} />
                    </button>
                </div>

                <button
                    onClick={handleAddKey}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
                >
                    <Plus size={16} />
                    Add Key
                </button>

                <div className="w-px h-6 bg-gray-700 mx-2" />

                <label className="p-2 text-gray-400 hover:text-white transition-colors cursor-pointer" title="Import JSON">
                    <Upload size={18} />
                    <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                </label>

                <button
                    onClick={handleExport}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="Export JSON"
                >
                    <Download size={18} />
                </button>
            </div>
        </div>
    );
};

export default TopBar;
