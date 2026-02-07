"use client";

import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useStore as useZustandStore } from 'zustand';
import { Plus, Download, Upload, RotateCcw, RotateCw, FileCode, Cpu, ChevronDown } from 'lucide-react';
import { generateQMKInfo } from '@/lib/qmk';
import { generateKicadProjectZip } from '@/lib/kicad';

const TopBar = () => {
    const { project, addKeys, importProject, gridSize, setGridSize, setProjectName } = useStore();
    // Use the zustand helper to consume the temporal store
    const { undo, redo, pastStates, futureStates } = useZustandStore(useStore.temporal, (state) => state);

    const [addCount, setAddCount] = useState(1);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };

        if (isExportMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isExportMenuOpen]);

    const handleAddKey = () => {
        addKeys(addCount, {
            position: { x: 0, y: 0 },
            size: { w: 1, h: 1 },
            angle: 0,
            rotationCenter: { x: 0, y: 0 },
            legends: { top: '', bottom: '', left: '', right: '' },
            matrix: { row: 0, col: 0 },
        });
    };

    const handleExportJson = () => {
        const dataStr = JSON.stringify(project, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name.replace(/\s+/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setIsExportMenuOpen(false);
    };

    const handleExportQMK = () => {
        const dataStr = generateQMKInfo(project);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'info.json';
        a.click();
        URL.revokeObjectURL(url);
        setIsExportMenuOpen(false);
    };

    const handleExportKicad = async () => {
        try {
            const blob = await generateKicadProjectZip(project);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${project.name.replace(/\s+/g, '_')}_kicad.zip`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to generate KiCad project:', error);
            alert('Failed to generate KiCad project');
        }
        setIsExportMenuOpen(false);
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
                <input
                    type="text"
                    key={project.name}
                    defaultValue={project.name}
                    onBlur={(e) => {
                        const val = e.target.value.trim();
                        if (val !== project.name) {
                            setProjectName(val || 'Untitled Project');
                        }
                    }}
                    onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                            e.currentTarget.blur();
                        }
                    }}
                    className="bg-transparent text-gray-300 text-sm focus:outline-none focus:border-b border-gray-500 hover:text-white transition-colors w-48"
                    placeholder="Project Name"
                />
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

                <div className="flex items-center gap-1 bg-gray-800 rounded px-2 py-1 mr-2 border border-gray-700">
                    <span className="text-xs text-gray-400">Grid:</span>
                    <select
                        value={gridSize}
                        onChange={(e) => setGridSize(parseFloat(e.target.value))}
                        className="bg-transparent text-white text-xs focus:outline-none appearance-none cursor-pointer px-1"
                    >
                        <option value="1" className="bg-gray-800">1U</option>
                        <option value="0.5" className="bg-gray-800">0.5U</option>
                        <option value="0.25" className="bg-gray-800">0.25U</option>
                        <option value="0.125" className="bg-gray-800">0.125U</option>
                        <option value="0.05" className="bg-gray-800">0.05U</option>
                    </select>
                </div>

                <div className="flex items-center gap-1 bg-gray-800 rounded px-2 py-1 mr-2 border border-gray-700">
                    <span className="text-xs text-gray-400">Count:</span>
                    <input
                        type="number"
                        min={1}
                        max={20}
                        value={addCount}
                        onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setAddCount(Math.min(20, Math.max(1, val)));
                        }}
                        className="w-12 bg-transparent text-white text-sm focus:outline-none text-center"
                    />
                </div>

                <button
                    onClick={handleAddKey}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
                >
                    <Plus size={16} />
                    Add Keys
                </button>

                <div className="w-px h-6 bg-gray-700 mx-2" />

                <label className="p-2 text-gray-400 hover:text-white transition-colors cursor-pointer" title="Import JSON">
                    <Upload size={18} />
                    <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                </label>

                {/* Export Menu Dropdown */}
                <div className="relative" ref={exportMenuRef}>
                    <button
                        onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                            isExportMenuOpen ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                        title="Export..."
                    >
                        <Download size={18} />
                        <span className="hidden sm:inline">Export</span>
                        <ChevronDown size={14} className={`transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isExportMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 overflow-hidden">
                            <div className="py-1">
                                <button
                                    onClick={handleExportJson}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2"
                                >
                                    <Download size={16} />
                                    <span>Export JSON (Project)</span>
                                </button>
                                <button
                                    onClick={handleExportQMK}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-green-400 flex items-center gap-2"
                                >
                                    <FileCode size={16} />
                                    <span>Export QMK (info.json)</span>
                                </button>
                                <button
                                    onClick={handleExportKicad}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-orange-400 flex items-center gap-2"
                                >
                                    <Cpu size={16} />
                                    <span>Export KiCad (.zip)</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TopBar;
