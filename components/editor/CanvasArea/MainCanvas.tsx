"use client";

import React, { useRef, useEffect } from 'react';
import { Stage, Layer } from 'react-konva';
import { useStore } from '@/store/useStore';
import GridBackground from './GridBackground';
import KeyObject from './KeyObject';
import { PIXELS_PER_U, ZOOM_MIN, ZOOM_MAX } from '@/lib/constants';
import Konva from 'konva';

const MainCanvas = () => {
    const { project, scale, pan, setZoom, setPan, updateKey, selectKey, clearSelection, selectedKeyIds, addKey } = useStore();
    const stageRef = useRef<Konva.Stage>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Handle window resize
    const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight,
                });
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;

        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        const direction = e.evt.deltaY > 0 ? -1 : 1;
        const newScale = direction > 0 ? oldScale * 1.1 : oldScale / 1.1;

        // Clamp scale
        const finalScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newScale));

        const newPos = {
            x: pointer.x - mousePointTo.x * finalScale,
            y: pointer.y - mousePointTo.y * finalScale,
        };

        setZoom(finalScale);
        setPan(newPos);
    };

    const checkDeselect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        // deselect when clicked on empty area
        const clickedOnEmpty = e.target === e.target.getStage();
        if (clickedOnEmpty) {
            clearSelection();
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!containerRef.current) return;

        const dataStr = e.dataTransfer.getData('application/json');
        if (!dataStr) return;

        try {
            const data = JSON.parse(dataStr);
            if (data.type !== 'preset') return;

            const rect = containerRef.current.getBoundingClientRect();
            const pointerX = e.clientX - rect.left;
            const pointerY = e.clientY - rect.top;

            // Convert to Stage Coords
            const stageX = (pointerX - pan.x) / scale;
            const stageY = (pointerY - pan.y) / scale;

            // Convert to U
            const uX = stageX / PIXELS_PER_U;
            const uY = stageY / PIXELS_PER_U;

            // Center the key
            const finalX = uX - data.w / 2;
            const finalY = uY - data.h / 2;

            // Snap initial position to grid
            const snappedX = Math.round(finalX / 0.25) * 0.25;
            const snappedY = Math.round(finalY / 0.25) * 0.25;

            addKey({
                position: { x: snappedX, y: snappedY },
                size: { w: data.w, h: data.h },
                angle: 0,
                rotationCenter: { x: 0, y: 0 },
                visualLegend: data.label.includes('Space') ? '' : data.label.replace('U', ''),
                matrix: { row: 0, col: 0 },
                variant: data.variant || 'rect',
            });

        } catch (err) {
            console.error("Failed to parse drop data", err);
        }
    };

    return (
        <div
            className="w-full h-full bg-neutral-900 overflow-hidden"
            ref={containerRef} // Logic depends on this receiving Drop events
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <Stage
                width={dimensions.width}
                height={dimensions.height}
                scaleX={scale}
                scaleY={scale}
                x={pan.x}
                y={pan.y}
                onWheel={handleWheel}
                onMouseDown={checkDeselect}
                onTouchStart={checkDeselect}
                draggable
                onDragEnd={(e) => {
                    if (e.target === stageRef.current) {
                        setPan({ x: e.target.x(), y: e.target.y() });
                    }
                }}
                ref={stageRef}
                className="cursor-crosshair"
            >
                <Layer>
                    <GridBackground width={dimensions.width} height={dimensions.height} />
                    {project.keys.map((key) => (
                        <KeyObject
                            key={key.id}
                            data={key}
                            isSelected={selectedKeyIds.includes(key.id)}
                            onSelect={selectKey}
                            onDragEnd={(id, x, y) => updateKey(id, { position: { x, y } })}
                        />
                    ))}
                </Layer>
            </Stage>
        </div>
    );
};

export default MainCanvas;
