"use client";

import React, { useMemo } from 'react';
import { Group, Line } from 'react-konva';
import { PIXELS_PER_U } from '@/lib/constants';
import { canvasTheme } from '@/lib/theme';

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
        const extent = range * PIXELS_PER_U;
        // Two-tier grid: subtle 1U lines, emphasized every 5U for orientation.
        const majorEvery = 5;

        // Vertical lines
        for (let i = 0; i <= range; i++) {
            const isMajor = i % majorEvery === 0;
            gridLines.push(
                <Line
                    key={`v${i}`}
                    points={[i * PIXELS_PER_U, 0, i * PIXELS_PER_U, extent]}
                    stroke={isMajor ? canvasTheme.gridMajor : canvasTheme.gridMinor}
                    strokeWidth={1}
                    listening={false}
                />
            );
        }

        // Horizontal lines
        for (let j = 0; j <= range; j++) {
            const isMajor = j % majorEvery === 0;
            gridLines.push(
                <Line
                    key={`h${j}`}
                    points={[0, j * PIXELS_PER_U, extent, j * PIXELS_PER_U]}
                    stroke={isMajor ? canvasTheme.gridMajor : canvasTheme.gridMinor}
                    strokeWidth={1}
                    listening={false}
                />
            );
        }

        // Origin axes (left and top borders of the layout area).
        gridLines.push(
            <Line
                key="origin-x"
                points={[0, 0, extent, 0]}
                stroke={canvasTheme.axis}
                strokeWidth={2}
                listening={false}
            />
        );
        gridLines.push(
            <Line
                key="origin-y"
                points={[0, 0, 0, extent]}
                stroke={canvasTheme.axis}
                strokeWidth={2}
                listening={false}
            />
        );

        return gridLines;
    }, []);

    return <Group>{lines}</Group>;
};

export default React.memo(GridBackground);
