"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import GridBackground from './GridBackground';
import KeyList from './KeyList';
import { PIXELS_PER_U, ZOOM_MIN, ZOOM_MAX } from '@/lib/constants';
import { doPolygonsIntersect, getRotatedRectPoints } from '@/lib/geometry';
import Konva from 'konva';

const MainCanvas = () => {
    const projectKeys = useStore(useShallow(state => state.project.keys));
    const { scale, pan, gridSize, selectedKeyIds } = useStore(useShallow(state => ({
        scale: state.scale,
        pan: state.pan,
        gridSize: state.gridSize,
        selectedKeyIds: state.selectedKeyIds,
    })));

    const { setZoom, setPan, selectKey, selectKeys, clearSelection, addKey } = useStore(useShallow(state => ({
        setZoom: state.setZoom,
        setPan: state.setPan,
        selectKey: state.selectKey,
        selectKeys: state.selectKeys,
        clearSelection: state.clearSelection,
        addKey: state.addKey,
    })));

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

    // Multi-touch state
    const [lastCenter, setLastCenter] = useState<{ x: number; y: number } | null>(null);
    const [lastDist, setLastDist] = useState<number>(0);

    const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
        return Math.hypot(p2.x - p1.x, p2.y - p1.y);
    };

    const getCenter = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
        };
    };

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

    const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        const stage = stageRef.current;
        if (!stage) return;

        // If clicking on empty area (stage)
        const clickedOnEmpty = e.target === stage;
        if (!clickedOnEmpty) return;

        // Check for multi-touch (pinch/pan)
        if (e.evt.type === 'touchstart') {
            const touchEvt = e.evt as TouchEvent;
            if (touchEvt.touches.length === 2) {
                // Start multi-touch gesture
                const t1 = touchEvt.touches[0];
                const t2 = touchEvt.touches[1];
                if (t1 && t2) {
                    const p1 = { x: t1.clientX, y: t1.clientY };
                    const p2 = { x: t2.clientX, y: t2.clientY };
                    setLastCenter(getCenter(p1, p2));
                    setLastDist(getDistance(p1, p2));
                }
                return; // Do not start selection
            }
        }

        // Middle Click Check
        if ('button' in e.evt && (e.evt as MouseEvent).button === 1) {
            setIsMiddleMousePressed(true);
            return;
        }

        // Left Click Selection or Touch Single Tap
        // Touch events don't have 'button', so we assume single touch is left click equivalent.
        let isLeftClick = true;
        if ('button' in e.evt) {
            isLeftClick = (e.evt as MouseEvent).button === 0;
        }

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
        const stage = stageRef.current;
        if (!stage) return;

        // Handle Multi-touch (TouchMove)
        if (e.evt.type === 'touchmove') {
            const touchEvt = e.evt as TouchEvent;
            touchEvt.preventDefault(); // Stop scrolling

            if (touchEvt.touches.length === 2 && lastCenter) {
                // Multi-touch Gesture Logic
                const t1 = touchEvt.touches[0];
                const t2 = touchEvt.touches[1];
                if (t1 && t2) {
                    const p1 = { x: t1.clientX, y: t1.clientY };
                    const p2 = { x: t2.clientX, y: t2.clientY };

                    const newCenter = getCenter(p1, p2);
                    const newDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

                    // 1. Pan
                    const dx = newCenter.x - lastCenter.x;
                    const dy = newCenter.y - lastCenter.y;
                    const newPan = { x: pan.x + dx, y: pan.y + dy };
                    setPan(newPan);

                    // 2. Zoom
                    if (lastDist > 0) {
                        const scaleFactor = newDist / lastDist;
                        const oldScale = stage.scaleX();
                        const newScaleRaw = oldScale * scaleFactor;
                        const finalScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newScaleRaw));

                        // Zoom towards center point
                        const pointTo = {
                            x: (newCenter.x - newPan.x) / oldScale,
                            y: (newCenter.y - newPan.y) / oldScale,
                        };

                        setZoom(finalScale);

                        // Adjust pan to keep pointTo fixed
                        // newStagePos = newCenter - pointTo * newScale
                        const adjustedPan = {
                            x: newCenter.x - pointTo.x * finalScale,
                            y: newCenter.y - pointTo.y * finalScale,
                        };
                        setPan(adjustedPan);
                    }

                    setLastCenter(newCenter);
                    setLastDist(newDist);
                }
                return;
            }
        }

        if (!isSelecting || !selectionBox) return;

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
        if (e.evt.type === 'touchend') {
            setLastCenter(null);
            setLastDist(0);
        }

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

                projectKeys.forEach(key => {
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

                    // AABB Check optimization (from conflict source)
                    const firstPoint = keyPoints[0];
                    if (!firstPoint) return;

                    let minX = firstPoint.x;
                    let maxX = firstPoint.x;
                    let minY = firstPoint.y;
                    let maxY = firstPoint.y;

                    for (let i = 1; i < keyPoints.length; i++) {
                        const p = keyPoints[i];
                        if (!p) continue;
                        if (p.x < minX) minX = p.x;
                        if (p.x > maxX) maxX = p.x;
                        if (p.y < minY) minY = p.y;
                        if (p.y > maxY) maxY = p.y;
                    }

                    if (maxX < x1 || minX > x2 || maxY < y1 || minY > y2) {
                        return;
                    }

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
            const snappedX = Math.round(finalX / gridSize) * gridSize;
            const snappedY = Math.round(finalY / gridSize) * gridSize;

            addKey({
                position: { x: Math.max(0, snappedX), y: Math.max(0, snappedY) },
                size: { w: data.w, h: data.h },
                angle: 0,
                rotationCenter: { x: 0, y: 0 },
                legends: {
                    top: data.label.includes('Space') ? '' : data.label.replace('U', ''),
                    bottom: '',
                    left: '',
                    right: ''
                },
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
            setLastCenter(null);
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

    const selectedKeysSet = React.useMemo(() => new Set(selectedKeyIds), [selectedKeyIds]);

    const handleKeyDragEnd = useCallback((id: string, x: number, y: number) => {
        const { selectedKeyIds, project, updateKeys, updateKey } = useStore.getState();
        if (selectedKeyIds.length > 1 && selectedKeyIds.includes(id)) {
            // Performance optimization: Create Map for O(1) lookup
            const keysById = new Map(project.keys.map(k => [k.id, k]));
            const draggedKey = keysById.get(id);
            if (!draggedKey) return;

            const deltaX = x - draggedKey.position.x;
            const deltaY = y - draggedKey.position.y;

            const updates = selectedKeyIds.map((selectedId): { id: string; data: Partial<import('@/types/mkd').KeyData> } | null => {
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
            }).filter((u): u is { id: string; data: Partial<import('@/types/mkd').KeyData> } => u !== null);

            updateKeys(updates);
        } else {
            updateKey(id, { position: { x, y } });
        }
    }, []);

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
                    onMouseMove={handleStageMouseMove} // Used for drag selection
                    onMouseUp={handleStageMouseUp}
                    onMouseLeave={() => setIsMiddleMousePressed(false)}
                    onTouchStart={handleStageMouseDown} // Basic Touch support for now
                    onTouchMove={handleStageMouseMove}
                    onTouchEnd={handleStageMouseUp}
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
                        <KeyList
                            keys={projectKeys}
                            selectedKeysSet={selectedKeysSet}
                            onSelect={selectKey}
                            onDragEnd={handleKeyDragEnd}
                        />
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
