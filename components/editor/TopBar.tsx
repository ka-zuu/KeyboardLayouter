"use client";

import React from 'react';
import { useStore } from '@/store/useStore';
import { Plus, Download, Upload } from 'lucide-react';

const TopBar = () => {
    const { project, addKey } = useStore();

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

    return (
        <div className="h-14 bg-gray-900 text-white flex items-center justify-between px-4 border-b border-gray-800">
            <div className="flex items-center gap-4">
                <h1 className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    MKD
                </h1>
                <span className="text-gray-500 text-sm">{project.name}</span>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={handleAddKey}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
                >
                    <Plus size={16} />
                    Add Key
                </button>

                <div className="w-px h-6 bg-gray-700 mx-2" />

                <button className="p-2 text-gray-400 hover:text-white transition-colors">
                    <Upload size={18} />
                </button>
                <button className="p-2 text-gray-400 hover:text-white transition-colors">
                    <Download size={18} />
                </button>
            </div>
        </div>
    );
};

export default TopBar;
