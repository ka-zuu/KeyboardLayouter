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
];

const LeftSidebar = () => {
    const { savedProjects, project, loadProject, createProject, deleteProject, saveProject } = useStore();

    const handleDragStart = (e: React.DragEvent, preset: typeof PRESETS[0]) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'preset',
            w: preset.w,
            h: preset.h,
            label: preset.label
        }));
        e.dataTransfer.effectAllowed = 'copy';
    };

    // Auto-save on mount/unmount or interval? 
    // Store updates directly to persist state, but `savedProjects` acts as "Library".
    // `project` is current. `persist` saves `project` to storage independently of `savedProjects`.
    // But if we want to see it in the list, we must call `saveProject`.
    // Let's add a "Save" button in TopBar or here.  
    // Or auto-sync loop.
    // For MVP, manual save or "Create New" saves previous.

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
                        className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded p-2 text-center text-xs cursor-move transition-colors flex flex-col items-center gap-1 select-none"
                    >
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
                {/* Current Project always needs to be explicitly saved to appear in list in this logic?
            Or we list keys of savedProjects.
            If current project ID is not in savedProjects, show it as "Unsaved"?
        */}
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
