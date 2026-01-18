"use client";

import React from 'react';
import { useStore } from '@/store/useStore';
import { Folder, Plus, Trash2, Box } from 'lucide-react';
import clsx from 'clsx'; // Assuming standard clsx or just use template literals

// Preset definitions
const PRESETS = [
    { label: '1U', w: 1, h: 1 },
    { label: '1.25U', w: 1.25, h: 1 },
    { label: '1.5U', w: 1.5, h: 1 },
    { label: '1.75U', w: 1.75, h: 1 },
    { label: '2U', w: 2, h: 1 },
    { label: '2.25U', w: 2.25, h: 1 },
    { label: '2.75U', w: 2.75, h: 1 },
    { label: '6.25U Space', w: 6.25, h: 1 },
    { label: 'ISO Enter', w: 1.5, h: 2, variant: 'iso_enter' },
];

const LeftSidebar = () => {
    const { savedProjects, project, loadProject, createProject, deleteProject, saveProject, addKey, pan, scale } = useStore();

    const handleDragStart = (e: React.DragEvent, preset: typeof PRESETS[0]) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'preset',
            w: preset.w,
            h: preset.h,
            label: preset.label,
            variant: (preset as any).variant
        }));
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handlePresetClick = (preset: typeof PRESETS[0]) => {
        // Calculate center of the viewport in canvas coordinates
        // Viewport center in screen pixels (approximate, relative to canvas area)
        // Since Sidebar is outside canvas, we can use window center or try to be more precise if possible.
        // For simplicity, let's assume the canvas takes up most of the screen minus sidebars.
        // But `pan` moves the canvas, so we need to account for it.
        // Canvas coordinate = (Screen coordinate - Pan) / Scale

        // Let's assume the center of the window is roughly where the user is looking.
        // A better approach might be to get the canvas element, but we are in Redux/State logic here loosely.
        // We'll use window.innerWidth / 2 and window.innerHeight / 2 as a rough center of the screen.
        // Then adjust for the sidebar width (approx 256px + 64px toolbars etc, but center of screen is fine).

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const x = (centerX - pan.x) / scale;
        const y = (centerY - pan.y) / scale;

        addKey({
            size: { w: preset.w, h: preset.h },
            position: {
                x: x - (preset.w / 2), // Center the key
                y: y - (preset.h / 2)
            },
            visualLegend: preset.label,
            angle: 0,
            rotationCenter: { x: 0, y: 0 },
            matrix: { row: 0, col: 0 },
            variant: (preset as any).variant
        });
    };

    return (
        <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col p-4 text-gray-300">

            {/* Presets Grid */}
            <h2 className="font-semibold mb-4 text-white">Add Keys</h2>
            <div className="grid grid-cols-2 gap-2 mb-8">
                {PRESETS.map((preset) => (
                    <div
                        key={preset.label}
                        draggable
                        onDragStart={(e) => handleDragStart(e, preset)}
                        onClick={() => handlePresetClick(preset)}
                        className="relative group bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded p-2 text-center text-xs cursor-pointer transition-colors flex flex-col items-center gap-1 select-none"
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePresetClick(preset);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-blue-600 rounded text-white hover:bg-blue-500 transition-opacity"
                            title="Add to Canvas"
                        >
                            <Plus size={10} />
                        </button>
                        <Box size={16} className="text-blue-400" />
                        {preset.label}
                    </div>
                ))}
            </div>

            <hr className="border-gray-800 mb-6" />

            {/* Projects List */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white">Projects</h2>
                <button onClick={createProject} className="text-blue-400 hover:text-blue-300">
                    <Plus size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
                <div
                    className={clsx(
                        "p-2 rounded cursor-pointer flex items-center gap-2",
                        "bg-blue-900/40 text-blue-200 border border-blue-800"
                    )}
                >
                    <Folder size={14} />
                    <span className="truncate flex-1">{project.name} (Active)</span>
                    <button onClick={() => saveProject()} className="text-xs bg-blue-700 px-1 rounded hover:bg-blue-600">Save</button>
                </div>

                {Object.values(savedProjects)
                    .filter(p => p.id !== project.id)
                    .sort((a, b) => b.updatedAt - a.updatedAt)
                    .map((p) => (
                        <div
                            key={p.id}
                            className="p-2 rounded cursor-pointer hover:bg-gray-800 flex items-center gap-2 group"
                            onClick={() => loadProject(p.id)}
                        >
                            <Folder size={14} className="text-gray-500" />
                            <span className="truncate flex-1 text-sm">{p.name}</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                                className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
            </div>
        </div>
    );
};

export default LeftSidebar;
