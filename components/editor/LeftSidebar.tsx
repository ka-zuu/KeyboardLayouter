"use client";

import React from 'react';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { Folder, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { PIXELS_PER_U, SIDEBAR_WIDTH } from '@/lib/constants';
import { KeyVariant } from '@/types/mkd';
import { Panel, SectionHeader } from '@/components/ui';

interface Preset {
    label: string;
    w: number;
    h: number;
    variant?: KeyVariant;
}

interface PresetTileProps {
    preset: Preset;
    onAdd: () => void;
    onDragStart: (e: React.DragEvent) => void;
}

/**
 * A preset entry rendered as a scaled mini-keycap so its proportions read at a
 * glance. Keycaps intentionally stay light (like real caps / the canvas keys)
 * regardless of UI theme.
 */
const PresetTile: React.FC<PresetTileProps> = ({ preset, onAdd, onDragStart }) => {
    // Clamp width scaling so a 6.25U space bar doesn't dwarf the 1U caps.
    const widthPct = Math.max(0.3, Math.min(1, preset.w / 2.75));
    const isTall = preset.h > 1;

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onClick={onAdd}
            className="group relative flex cursor-pointer select-none flex-col items-center gap-2 rounded-lg border border-border bg-raised p-2.5 transition-colors hover:border-border-strong hover:bg-raised-hover"
        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onAdd();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute right-1.5 top-1.5 rounded bg-accent p-0.5 text-on-accent opacity-0 transition-opacity hover:bg-accent-hover group-hover:opacity-100"
                title="Add to Canvas"
                aria-label={`Add ${preset.label}`}
            >
                <Plus size={10} />
            </button>
            <div className="flex h-8 w-full items-center justify-center">
                <div
                    className="rounded-[3px] border border-black/10 bg-gradient-to-b from-[#eceef1] to-[#d5d8de] shadow-sm"
                    style={{ width: `${widthPct * 100}%`, height: isTall ? '100%' : '60%' }}
                />
            </div>
            <span className="text-xs text-muted group-hover:text-fg">{preset.label}</span>
        </div>
    );
};

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
    // Optimization: Use shallow comparison to avoid re-renders when other parts of the store change (e.g. keys)
    const { savedProjects, projectId, projectName, loadProject, createProject, deleteProject, saveProject, addKey } = useStore(useShallow((state) => ({
        savedProjects: state.savedProjects,
        projectId: state.project.id,
        projectName: state.project.name,
        loadProject: state.loadProject,
        createProject: state.createProject,
        deleteProject: state.deleteProject,
        saveProject: state.saveProject,
        addKey: state.addKey,
    })));

    const sortedProjects = React.useMemo(() => {
        return Object.values(savedProjects)
            .filter(p => p.id !== projectId)
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }, [savedProjects, projectId]);

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
        const { pan, scale, gridSize, project } = useStore.getState();

        // Calculate center of the Canvas between the two sidebars
        const canvasWidth = window.innerWidth - SIDEBAR_WIDTH * 2;
        const screenCenterX = SIDEBAR_WIDTH + (canvasWidth / 2);
        const screenCenterY = window.innerHeight / 2;

        const stageContainerX = screenCenterX - SIDEBAR_WIDTH;
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
        <Panel side="left" className="p-4">
            {/* Presets Grid */}
            <SectionHeader title="Add Keys" className="mb-3" />
            <div className="grid grid-cols-2 gap-2 mb-6">
                {PRESETS.map((preset) => (
                    <PresetTile
                        key={preset.label}
                        preset={preset}
                        onAdd={() => handlePresetClick(preset)}
                        onDragStart={(e) => handleDragStart(e, preset)}
                    />
                ))}
            </div>

            <hr className="border-border mb-5" />

            {/* Projects List */}
            <SectionHeader
                title="Projects"
                className="mb-3"
                action={
                    <button
                        onClick={createProject}
                        className="rounded-md p-1 text-accent transition-colors hover:bg-accent-subtle hover:text-accent-hover"
                        title="New project"
                        aria-label="New project"
                    >
                        <Plus size={18} />
                    </button>
                }
            />

            <div className="flex-1 overflow-y-auto space-y-1">
                <div
                    className={clsx(
                        'flex items-center gap-2 rounded-md border p-2',
                        'border-accent-border bg-accent-subtle text-fg'
                    )}
                >
                    <Folder size={14} className="text-accent" />
                    <span className="flex-1 truncate text-sm">{projectName}</span>
                    <button
                        onClick={() => saveProject()}
                        className="rounded bg-accent px-2 py-0.5 text-xs font-medium text-on-accent transition-colors hover:bg-accent-hover"
                    >
                        Save
                    </button>
                </div>

                {sortedProjects.map((p) => (
                    <div
                        key={p.id}
                        className="group flex cursor-pointer items-center gap-2 rounded-md p-2 transition-colors hover:bg-raised"
                        onClick={() => loadProject(p.id)}
                    >
                        <Folder size={14} className="text-subtle" />
                        <span className="flex-1 truncate text-sm text-muted group-hover:text-fg">{p.name}</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                            className="text-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                            title="Delete project"
                            aria-label={`Delete ${p.name}`}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </Panel>
    );
};

export default LeftSidebar;
