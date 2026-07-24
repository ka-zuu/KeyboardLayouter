"use client";

import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useStore as useZustandStore } from 'zustand';
import { Plus, Download, Upload, RotateCcw, RotateCw, FileCode, Cpu, ChevronDown } from 'lucide-react';
import { generateQMKInfo } from '@/lib/qmk';
import { generateKicadProjectZip } from '@/lib/kicad';
import { Button, IconButton, Select, NumberField } from '@/components/ui';

const Divider = () => <div className="mx-1 h-6 w-px bg-border" />;

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
        <div className="h-14 bg-surface text-fg flex items-center justify-between px-4 border-b border-border">
            {/* Cluster: brand + project name */}
            <div className="flex items-center gap-3">
                <h1 className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-accent to-accent-hover">
                    MKD
                </h1>
                <div className="h-6 w-px bg-border" />
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
                    className="w-48 rounded-md bg-transparent px-2 py-1 text-sm text-muted hover:text-fg focus:text-fg focus:bg-inset border border-transparent focus:border-border focus-visible:outline-none transition-colors"
                    placeholder="Project Name"
                />
            </div>

            <div className="flex items-center gap-2">
                {/* Cluster: history */}
                <div className="flex items-center rounded-md bg-raised border border-border">
                    <IconButton label="Undo" onClick={() => undo()} disabled={pastStates.length === 0}>
                        <RotateCcw size={16} />
                    </IconButton>
                    <IconButton label="Redo" onClick={() => redo()} disabled={futureStates.length === 0}>
                        <RotateCw size={16} />
                    </IconButton>
                </div>

                <Divider />

                {/* Cluster: add tools. Note: the "Grid:"/"Count:" label text and the
                    div wrapping the input are relied upon by e2e locators — keep them. */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-subtle">Grid:</span>
                    <div className="w-24">
                        <Select
                            aria-label="Grid size"
                            value={gridSize}
                            onChange={(e) => setGridSize(parseFloat(e.target.value))}
                        >
                            <option value="1">1U</option>
                            <option value="0.5">0.5U</option>
                            <option value="0.25">0.25U</option>
                            <option value="0.125">0.125U</option>
                            <option value="0.05">0.05U</option>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-subtle">Count:</span>
                    <div className="w-16">
                        <NumberField
                            aria-label="Number of keys to add"
                            min={1}
                            max={20}
                            value={addCount}
                            onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                setAddCount(Math.min(20, Math.max(1, val)));
                            }}
                            className="text-center"
                        />
                    </div>
                </div>

                <Button variant="primary" onClick={handleAddKey} size="sm">
                    <Plus size={16} />
                    Add Keys
                </Button>

                <Divider />

                {/* Cluster: import / export */}
                <label
                    className="inline-flex cursor-pointer items-center justify-center rounded-md p-2 text-muted transition-colors hover:bg-raised hover:text-fg"
                    title="Import JSON"
                >
                    <Upload size={18} />
                    <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                </label>

                {/* Export Menu Dropdown */}
                <div className="relative" ref={exportMenuRef}>
                    <Button
                        variant={isExportMenuOpen ? 'subtle' : 'ghost'}
                        size="sm"
                        onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                        title="Export..."
                    >
                        <Download size={18} />
                        <span className="hidden sm:inline">Export</span>
                        <ChevronDown
                            size={14}
                            className={`transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`}
                        />
                    </Button>

                    {isExportMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-raised border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                            <div className="p-1">
                                <button
                                    onClick={handleExportJson}
                                    className="w-full text-left px-3 py-2 rounded-md text-sm text-muted hover:bg-raised-hover hover:text-fg flex items-center gap-2 transition-colors"
                                >
                                    <Download size={16} />
                                    <span>Export JSON (Project)</span>
                                </button>
                                <button
                                    onClick={handleExportQMK}
                                    className="w-full text-left px-3 py-2 rounded-md text-sm text-muted hover:bg-raised-hover hover:text-success flex items-center gap-2 transition-colors"
                                >
                                    <FileCode size={16} />
                                    <span>Export QMK (info.json)</span>
                                </button>
                                <button
                                    onClick={handleExportKicad}
                                    className="w-full text-left px-3 py-2 rounded-md text-sm text-muted hover:bg-raised-hover hover:text-warning flex items-center gap-2 transition-colors"
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
