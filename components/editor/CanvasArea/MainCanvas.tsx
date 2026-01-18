"use client";

import React, { useRef, useEffect } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { useStore } from '@/store/useStore';
import GridBackground from './GridBackground';
import KeyObject from './KeyObject';
import { PIXELS_PER_U, ZOOM_MIN, ZOOM_MAX } from '@/lib/constants';
import { doPolygonsIntersect, getRotatedRectPoints } from '@/lib/geometry';
import Konva from 'konva';

const MainCanvas = () => {
    const { project, scale, pan, setZoom, setPan, updateKey, updateKeys, selectKey, selectKeys, clearSelection, selectedKeyIds, addKey } = useStore();
    const stageRef = useRef<Konva.Stage>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Selection State
    const [isSelecting, setIsSelecting] = React.useState(false);
    const [selectionBox, setSelectionBox] = React.useState<{ startX: number, startY: number, endX: number, endY: number } | null>(null);

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

    // Touch Handling State
    const lastDist = useRef<number>(0);
    const lastCenter = useRef<{ x: number, y: number } | null>(null);

    const getDistance = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    };

    const getCenter = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
        };
    };

    const handleTouchStart = (e: Konva.KonvaEventObject<TouchEvent>) => {
        const touches = e.evt.touches;
        if (touches.length === 2) {
            e.evt.preventDefault(); // Stop default scroll/zoom
            const p1 = { x: touches[0].clientX, y: touches[0].clientY };
            const p2 = { x: touches[1].clientX, y: touches[1].clientY };

            lastDist.current = getDistance(p1, p2);
            lastCenter.current = getCenter(p1, p2);
        } else if (touches.length === 1) {
             // Defer to mouse down handler logic for selection
             handleStageMouseDown(e);
        }
    };

    const handleTouchMove = (e: Konva.KonvaEventObject<TouchEvent>) => {
        const touches = e.evt.touches;
        if (touches.length === 2) {
            e.evt.preventDefault();
            const stage = stageRef.current;
            if (!stage) return;

            const p1 = { x: touches[0].clientX, y: touches[0].clientY };
            const p2 = { x: touches[1].clientX, y: touches[1].clientY };

            const newDist = getDistance(p1, p2);
            const newCenter = getCenter(p1, p2);

            if (lastCenter.current && lastDist.current > 0) {
                // Zoom
                const pointTo = {
                    x: (lastCenter.current.x - stage.x()) / scale,
                    y: (lastCenter.current.y - stage.y()) / scale,
                };

                const scaleBy = newDist / lastDist.current;
                const newScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, scale * scaleBy));

                // Pan (based on center movement + zoom offset)
                // New position = newCenter - (pointTo * newScale)
                // But wait, standard pinch zoom logic:
                // 1. Scale relative to center
                // 2. Translate based on center move

                const dx = newCenter.x - lastCenter.current.x;
                const dy = newCenter.y - lastCenter.current.y;

                // First calculate where the stage would be if we just scaled around lastCenter
                // oldPos = lastCenter
                // newPos = lastCenter
                // But we want pointTo to remain at lastCenter (visually)
                // Actually Konva has simple math:

                const newPos = {
                    x: newCenter.x - pointTo.x * newScale,
                    y: newCenter.y - pointTo.y * newScale
                };

                setZoom(newScale);
                setPan(newPos);
            }

            lastDist.current = newDist;
            lastCenter.current = newCenter;
        } else if (touches.length === 1) {
            handleStageMouseMove(e);
        }
    };

    const handleTouchEnd = (e: Konva.KonvaEventObject<TouchEvent>) => {
        lastDist.current = 0;
        lastCenter.current = null;
        if (e.evt.touches.length === 0) {
            handleStageMouseUp(e);
        }
    };

    const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        const stage = stageRef.current;
        if (!stage) return;

        // If clicking on empty area (stage)
        const clickedOnEmpty = e.target === stage;
        if (!clickedOnEmpty) return;

        // Middle Click Check
        if ('button' in e.evt && (e.evt as MouseEvent).button === 1) {
            setIsMiddleMousePressed(true);
            return;
        }

        // Left Click Selection
        // Touch events don't have 'button', so we assume single touch is left click equivalent.
        const isLeftClick = ('button' in e.evt) ? (e.evt as MouseEvent).button === 0 : true;

        if (isLeftClick && !isSpacePressed && !isMiddleMousePressed) {
            // Clear selection if Shift not held (Standard behavior)
            if (!e.evt.shiftKey) {
                clearSelection();
            }

            const pos = stage.getRelativePointerPosition();
            if (pos) {
                setIsSelecting(true);
                setSelectionBox({
                    startX: pos.x,
                    startY: pos.y,
                    endX: pos.x,
                    endY: pos.y
                });
            }
        }
    };

    const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (!isSelecting || !selectionBox) return;

        const stage = stageRef.current;
        if (!stage) return;

        const pos = stage.getRelativePointerPosition();
        if (pos) {
            setSelectionBox({
                ...selectionBox,
                endX: pos.x,
                endY: pos.y
            });
        }
    };

    const handleStageMouseUp = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (isMiddleMousePressed) setIsMiddleMousePressed(false);
        if (isSelecting && selectionBox) {
            const stage = stageRef.current;
            if (stage) {
                // Normalize Selection Box (which is a polygon)
                const x1 = Math.min(selectionBox.startX, selectionBox.endX);
                const x2 = Math.max(selectionBox.startX, selectionBox.endX);
                const y1 = Math.min(selectionBox.startY, selectionBox.endY);
                const y2 = Math.max(selectionBox.startY, selectionBox.endY);

                const selectionRectPoints = [
                    { x: x1, y: y1 },
                    { x: x2, y: y1 },
                    { x: x2, y: y2 },
                    { x: x1, y: y2 }
                ];

                const newSelectedIds: string[] = [];

                project.keys.forEach(key => {
                    const kx = key.position.x * PIXELS_PER_U;
                    const ky = key.position.y * PIXELS_PER_U;
                    const kw = key.size.w * PIXELS_PER_U;
                    const kh = key.size.h * PIXELS_PER_U;

                    // Get Key Polygon (Rotated)
                    const keyPoints = getRotatedRectPoints(
                        kx,
                        ky,
                        kw,
                        kh,
                        key.angle,
                        key.rotationCenter.x * PIXELS_PER_U,
                        key.rotationCenter.y * PIXELS_PER_U
                    );

                    if (doPolygonsIntersect(selectionRectPoints, keyPoints)) {
                        newSelectedIds.push(key.id);
                    }
                });

                if (e.evt.shiftKey) {
                    const combined = Array.from(new Set([...selectedKeyIds, ...newSelectedIds]));
                    selectKeys(combined);
                } else {
                    selectKeys(newSelectedIds);
                }
            }
        }
        setIsSelecting(false);
        setSelectionBox(null);
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

    // Track Space key and Middle Mouse for Pan Mode
    const [isSpacePressed, setIsSpacePressed] = React.useState(false);
    const [isMiddleMousePressed, setIsMiddleMousePressed] = React.useState(false);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            // Ignore inputs
            const target = e.target as HTMLElement;
            if (target.matches("input, textarea, select, [contenteditable]")) return;

            if (e.code === 'Space' && !e.repeat) {
                setIsSpacePressed(true);
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsSpacePressed(false);
            }
        };
        // Reset on Blur
        const onBlur = () => {
            setIsSpacePressed(false);
            setIsMiddleMousePressed(false);
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', onBlur);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
        };
    }, []);

    const isDraggable = isSpacePressed || isMiddleMousePressed;

    return (
        <div
            className={`w-full h-full bg-neutral-900 overflow-hidden ${isSpacePressed ? 'cursor-grab' : 'cursor-default'}`}
            ref={containerRef}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {dimensions.width > 0 && dimensions.height > 0 && (
                <Stage
                    width={dimensions.width}
                    height={dimensions.height}
                    scaleX={scale}
                    scaleY={scale}
                    x={pan.x}
                    y={pan.y}
                    onWheel={handleWheel}
                    onMouseDown={handleStageMouseDown}
                    onMouseMove={handleStageMouseMove}
                    onMouseUp={handleStageMouseUp}
                    onMouseLeave={() => setIsMiddleMousePressed(false)}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    draggable={isDraggable}
                    onDragEnd={(e) => {
                        if (e.target === stageRef.current) {
                            setPan({ x: e.target.x(), y: e.target.y() });
                        }
                    }}
                    ref={stageRef}
                >
                    <Layer>
                        <GridBackground width={dimensions.width} height={dimensions.height} />
                        {project.keys.map((key) => (
                            <KeyObject
                                key={key.id}
                                data={key}
                                isSelected={selectedKeyIds.includes(key.id)}
                                onSelect={selectKey}
                                onDragEnd={(id, x, y) => {
                                    if (selectedKeyIds.includes(id)) {
                                        // Performance optimization: Create Map for O(1) lookup
                                        const keysById = new Map(project.keys.map(k => [k.id, k]));
                                        const draggedKey = keysById.get(id);
                                        if (!draggedKey) return;

                                        const deltaX = x - draggedKey.position.x;
                                        const deltaY = y - draggedKey.position.y;

                                        type UpdateType = { id: string; data: Partial<import('@/types/mkd').KeyData> };

                                        const updates = selectedKeyIds.map((selectedId): UpdateType | null => {
                                            const key = keysById.get(selectedId);
                                            if (!key) return null;
                                            return {
                                                id: selectedId,
                                                data: {
                                                    position: {
                                                        x: key.position.x + deltaX,
                                                        y: key.position.y + deltaY
                                                    }
                                                }
                                            };
                                        }).filter((u): u is UpdateType => u !== null);

                                        updateKeys(updates);
                                    } else {
                                        updateKey(id, { position: { x, y } });
                                    }
                                }}
                            />
                        ))}
                        {/* Selection Box */}
                        {isSelecting && selectionBox && (
                            <Rect
                                x={Math.min(selectionBox.startX, selectionBox.endX)}
                                y={Math.min(selectionBox.startY, selectionBox.endY)}
                                width={Math.abs(selectionBox.endX - selectionBox.startX)}
                                height={Math.abs(selectionBox.endY - selectionBox.startY)}
                                fill="rgba(66, 153, 225, 0.3)" // Blue 500 equivalent with opacity
                                stroke="#4299e1"
                                strokeWidth={1 / scale}
                            />
                        )}
                    </Layer>
                </Stage>
            )}
        </div>
    );
};

export default MainCanvas;
