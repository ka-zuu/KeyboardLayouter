"use client";

import React from 'react';
import { useStore } from '@/store/useStore';
import { Folder, Plus, Trash2, Box } from 'lucide-react';
import clsx from 'clsx'; // Assuming standard clsx or just use template literals
import { PIXELS_PER_U } from '@/lib/constants';
import { KeyVariant } from '@/types/mkd';

interface Preset {
    label: string;
    w: number;
    h: number;
    variant?: KeyVariant;
}

// Preset definitions
const PRESETS: Preset[] = [
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
    const { savedProjects, project, loadProject, createProject, deleteProject, saveProject, addKey, pan, scale, gridSize } = useStore();

    const handleDragStart = (e: React.DragEvent, preset: Preset) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'preset',
            w: preset.w,
            h: preset.h,
            label: preset.label,
            variant: preset.variant
        }));
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handlePresetClick = (preset: Preset) => {
        // Calculate center of the Canvas
        // Sidebar is 64 tailwind units = 16rem = 256px
        const sidebarWidth = 256;
        const rightSidebarWidth = 256; // RightSidebar is also w-64
        const canvasWidth = window.innerWidth - sidebarWidth - rightSidebarWidth;
        // Center of the canvas relative to the window
        const screenCenterX = sidebarWidth + (canvasWidth / 2);
        const screenCenterY = window.innerHeight / 2;

        // Container offset is sidebarWidth
        const stageContainerX = screenCenterX - sidebarWidth;
        const stageContainerY = screenCenterY;

        // World Coordinates in Pixels
        const pixelX = (stageContainerX - pan.x) / scale;
        const pixelY = (stageContainerY - pan.y) / scale;

        // Convert to U units
        const uX = pixelX / PIXELS_PER_U;
        const uY = pixelY / PIXELS_PER_U;

        // Center the key and snap to grid
        const rawX = uX - (preset.w / 2);
        const rawY = uY - (preset.h / 2);

        let snappedX = Math.round(rawX / gridSize) * gridSize;
        const snappedY = Math.round(rawY / gridSize) * gridSize;

        // Overlap detection and position adjustment
        const MAX_RETRIES = 100; // Prevent infinite loops
        let retries = 0;

        while (retries < MAX_RETRIES) {
            const isOverlapping = project.keys.some((k) => {
                // Key to be added
                const newLeft = snappedX;
                const newRight = snappedX + preset.w;
                const newTop = snappedY;
                const newBottom = snappedY + preset.h;

                // Existing key
                const kLeft = k.position.x;
                const kRight = k.position.x + k.size.w;
                const kTop = k.position.y;
                const kBottom = k.position.y + k.size.h;

                // Simple AABB collision detection with a small epsilon for float precision
                const epsilon = 0.001;
                return (
                    newLeft < kRight - epsilon &&
                    newRight > kLeft + epsilon &&
                    newTop < kBottom - epsilon &&
                    newBottom > kTop + epsilon
                );
            });

            if (!isOverlapping) {
                break;
            }

            // Move to the right by one grid unit
            snappedX += gridSize;
            retries++;
        }

        // Format legend consistent with drag & drop behavior
        const legendLabel = preset.label.includes('Space') ? '' : preset.label.replace('U', '');

        addKey({
            size: { w: preset.w, h: preset.h },
            position: {
                x: snappedX,
                y: snappedY
            },
            legends: {
                top: legendLabel,
                bottom: '',
                left: '',
                right: ''
            },
            angle: 0,
            rotationCenter: { x: 0, y: 0 },
            matrix: { row: 0, col: 0 },
            variant: preset.variant
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
