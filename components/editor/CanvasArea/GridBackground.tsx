"use client";

import React, { useMemo } from 'react';
import { Group, Line } from 'react-konva';
import { PIXELS_PER_U } from '@/lib/constants';

interface GridBackgroundProps {
    width: number;
    height: number;
}

const GridBackground: React.FC<GridBackgroundProps> = () => {
    // Draw a grid of reasonable size around origin.
    // Range: 0 to +50U
    const range = 50;

    const lines = useMemo(() => {
        const gridLines = [];
        const color = '#333';
        const strokeWidth = 1;

        // Vertical lines
        for (let i = 0; i <= range; i++) {
            gridLines.push(
                <Line
                    key={`v${i}`}
                    points={[i * PIXELS_PER_U, 0, i * PIXELS_PER_U, range * PIXELS_PER_U]}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    listening={false}
                />
            );
        }

        // Horizontal lines
        for (let j = 0; j <= range; j++) {
            gridLines.push(
                <Line
                    key={`h${j}`}
                    points={[0, j * PIXELS_PER_U, range * PIXELS_PER_U, j * PIXELS_PER_U]}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    listening={false}
                />
            );
        }

        // Origin lines (thicker or different color) - Now acting as left and top borders
        gridLines.push(
            <Line
                key="origin-x"
                points={[0, 0, range * PIXELS_PER_U, 0]}
                stroke="#555"
                strokeWidth={2}
                listening={false}
            />
        );
        gridLines.push(
            <Line
                key="origin-y"
                points={[0, 0, 0, range * PIXELS_PER_U]}
                stroke="#555"
                strokeWidth={2}
                listening={false}
            />
        );

        return gridLines;
    }, []);

    return <Group>{lines}</Group>;
};

export default GridBackground;
