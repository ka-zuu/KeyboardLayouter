"use client";

import React, { useRef, useEffect } from 'react';
import { Group, Rect, Text, Circle, Path } from 'react-konva';
import { KeyData } from '@/types/mkd';
import { PIXELS_PER_U, ISO_ENTER_PATH } from '@/lib/constants';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { rotatePointPrecalc } from '@/lib/geometry';
import Konva from 'konva';

interface KeyObjectProps {
    id: string;
    isSelected: boolean;
    onSelect: (id: string, multi: boolean) => void;
    onDragEnd: (id: string, x: number, y: number) => void;
}

const KeyObject: React.FC<KeyObjectProps> = ({ id, isSelected, onSelect, onDragEnd }) => {
    const data = useStore(useShallow(state => state.project.keys.find(k => k.id === id)));
    const snapEnabled = useStore(state => state.snapEnabled);
    const gridSize = useStore(state => state.gridSize);
    const updateKeys = useStore(state => state.updateKeys);

    const groupRef = useRef<Konva.Group>(null);
    const lastDragPos = useRef<{ x: number, y: number } | null>(null);
    const dragStartPos = useRef<{ x: number, y: number } | null>(null); // Store initial position
    const pendingRotationUpdates = useRef<{ id: string; data: Partial<KeyData> }[]>([]);

    // Performance optimization: Cache participating keys during rotation drag
    const rotationContextRef = useRef<{
        participatingKeys: KeyData[];
        participatingNodes: Map<string, Konva.Node>;
        pivotId: string;
    } | null>(null);

    // Performance optimization: Cache participating nodes during move drag
    const draggedNodesRef = useRef<Konva.Node[]>([]);

    // Calculate derived values safely, even if data is undefined (though effect depends on it)
    const width = data ? data.size.w * PIXELS_PER_U : 0;
    const height = data ? data.size.h * PIXELS_PER_U : 0;
    const x = data ? data.position.x * PIXELS_PER_U : 0;
    const y = data ? data.position.y * PIXELS_PER_U : 0;

    // Visual styling
    const keyColor = '#f0f0f0';
    const textColor = '#333';
    const strokeColor = isSelected ? '#3b82f6' : '#999';
    const strokeWidth = isSelected ? 3 : 1;

    useEffect(() => {
        if (!data) return;
        const group = groupRef.current;
        if (group) {
            group.cache({ pixelRatio: 2 });
        }
    }, [data, isSelected, width, height, keyColor, strokeColor, strokeWidth]);

    if (!data) return null;

    // Calculate Center for Pivot
    const halfW = width / 2;
    const halfH = height / 2;
    const centerX = x + halfW;
    const centerY = y + halfH;

    const handleDragEndCenter = (e: Konva.KonvaEventObject<DragEvent>) => {
        // Prevent event bubbling to avoid duplicate handling in parent layers
        e.cancelBubble = true;

        const nx = e.target.x();
        const ny = e.target.y();
        // nx, ny is new Center.
        // data.x (TopLeft) = nx - halfW
        // Convert px to U
        const uX = (nx - halfW) / PIXELS_PER_U;
        const uY = (ny - halfH) / PIXELS_PER_U;

        // Check for Multi-Selection
        const selectedKeyIds = useStore.getState().selectedKeyIds;
        if (selectedKeyIds.length > 1 && selectedKeyIds.includes(data.id) && dragStartPos.current) {
             // Calculate Total Delta in U
             const initialCenter = dragStartPos.current; // Center PX
             // Current Center PX is nx, ny
             const deltaX_px = nx - initialCenter.x;
             const deltaY_px = ny - initialCenter.y;

             const deltaX_u = deltaX_px / PIXELS_PER_U;
             const deltaY_u = deltaY_px / PIXELS_PER_U;

             const allKeys = useStore.getState().project.keys;
             const updates: { id: string; data: Partial<KeyData> }[] = [];

             const selectedSet = new Set(selectedKeyIds);
             allKeys.forEach(k => {
                 if (selectedSet.has(k.id)) {
                     updates.push({
                         id: k.id,
                         data: {
                             position: {
                                 x: k.position.x + deltaX_u,
                                 y: k.position.y + deltaY_u
                             }
                         }
                     });
                 }
             });

             updateKeys(updates);

             // Reset refs
             dragStartPos.current = null;
             lastDragPos.current = null;
             draggedNodesRef.current = [];
        } else {
             // Single Key Update
             onDragEnd(data.id, uX, uY);
        }
    };

    const dragBoundFunc = (pos: { x: number; y: number }) => {
        if (!snapEnabled) return pos;

        const stage = groupRef.current?.getStage();
        if (!stage) return pos;

        const scale = stage.scaleX();
        const stageX = stage.x();
        const stageY = stage.y();

        const snapPx = gridSize * PIXELS_PER_U;

        // Convert absolute pos (which is the new center) to local space
        const localCenterX = (pos.x - stageX) / scale;
        const localCenterY = (pos.y - stageY) / scale;

        // Calculate local top-left
        const localTopLeftX = localCenterX - halfW;
        const localTopLeftY = localCenterY - halfH;

        // Snap local top-left
        const snappedLocalTopLeftX = Math.round(localTopLeftX / snapPx) * snapPx;
        const snappedLocalTopLeftY = Math.round(localTopLeftY / snapPx) * snapPx;

        // Convert back to absolute center
        const snappedLocalCenterX = snappedLocalTopLeftX + halfW;
        const snappedLocalCenterY = snappedLocalTopLeftY + halfH;

        return {
            x: snappedLocalCenterX * scale + stageX,
            y: snappedLocalCenterY * scale + stageY,
        };
    };

    const handleRotationDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
        e.cancelBubble = true; // prevent group drag
        const stage = e.target.getStage();
        const group = groupRef.current;
        if (!stage || !group) return;

        const pos = stage.getPointerPosition();
        if (!pos) return;

        // Calculate angle relative to group center
        const groupAbs = group.getAbsolutePosition();
        const dx = pos.x - groupAbs.x;
        const dy = pos.y - groupAbs.y;

        const angleRad = Math.atan2(dy, dx);
        const angleDeg = angleRad * 180 / Math.PI;
        // At rotation 0, handle is at (0, -radius). Vector(0, -1) -> -90 deg.
        // So we add 90 deg to align.
        const newRotation = angleDeg + 90;

        // Use cached context if available, otherwise fallback to store (though dragStart should have set it)
        const context = rotationContextRef.current;

        // If single selection or no context, just update this key
        if (!context) {
            // Imperative update for single selection
            const node = stage.findOne('#' + data.id);
            if (node) {
                node.rotation(newRotation);
            }
            pendingRotationUpdates.current = [{ id: data.id, data: { angle: newRotation } }];
            return;
        }

        // Batch Rotation
        const pivotId = data.id;
        const previousAngle = data.angle;
        // Calculate delta
        const deltaRotation = newRotation - previousAngle;

        const rad = (deltaRotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        // Prepare updates
        const updates: { id: string, data: Partial<KeyData> }[] = [];

        // Pivot Center in U units
        const pivotCenterX = data.position.x + data.size.w / 2;
        const pivotCenterY = data.position.y + data.size.h / 2;

        // Iterate over cached participating keys instead of all project keys
        context.participatingKeys.forEach(k => {
            // Retrieve node from cache
            const node = context.participatingNodes.get(k.id);

            if (k.id === pivotId) {
                const update = { id: k.id, data: { angle: newRotation } };
                updates.push(update);

                // Imperative Update
                if (node) {
                    node.rotation(newRotation);
                }
            } else {
                // Normalize angle
                const kNewAngle = k.angle + deltaRotation;

                // Orbitting Logic
                // 1. Get Key Center
                const kCenterX = k.position.x + k.size.w / 2;
                const kCenterY = k.position.y + k.size.h / 2;

                // 2. Rotate Key Center around Pivot Center
                const rotatedCenter = rotatePointPrecalc(
                    { x: kCenterX, y: kCenterY },
                    { x: pivotCenterX, y: pivotCenterY },
                    sin,
                    cos
                );

                // 3. Convert back to Top-Left position
                const newPos = {
                    x: rotatedCenter.x - k.size.w / 2,
                    y: rotatedCenter.y - k.size.h / 2
                };

                updates.push({
                    id: k.id,
                    data: {
                        position: newPos,
                        angle: kNewAngle
                    }
                });

                // Imperative Update
                if (node) {
                    node.rotation(kNewAngle);
                    // Convert U to Px for Konva Node
                    node.x((newPos.x * PIXELS_PER_U) + (k.size.w * PIXELS_PER_U / 2));
                    node.y((newPos.y * PIXELS_PER_U) + (k.size.h * PIXELS_PER_U / 2));
                }
            }
        });

        if (updates.length > 0) {
            pendingRotationUpdates.current = updates;
        }
    };

    return (
        <Group
            id={data.id} // ID for selection lookup
            data-testid="key-object"
            data-selected={isSelected ? "true" : "false"}
            x={centerX}
            y={centerY}
            width={width}
            height={height}
            offsetX={0}
            offsetY={0}
            rotation={data.angle}
            draggable
            onDragStart={(e) => {
                // Initialize drag start position for delta calculation
                const startX = e.target.x();
                const startY = e.target.y();
                lastDragPos.current = { x: startX, y: startY };
                dragStartPos.current = { x: startX, y: startY };

                const state = useStore.getState();
                const currentSelectedIds = state.selectedKeyIds;
                if (currentSelectedIds.length > 1 && currentSelectedIds.includes(data.id)) {
                    const stage = e.target.getStage();
                    if (stage) {
                        draggedNodesRef.current = [];
                        currentSelectedIds.forEach(id => {
                             if (id === data.id) return; // Skip self
                             const node = stage.findOne('#' + id);
                             if (node) {
                                 draggedNodesRef.current.push(node);
                             }
                        });
                    }
                } else {
                    draggedNodesRef.current = [];
                }
            }}
            onDragMove={(e) => {
                // Multi-select Drag Logic
                if (draggedNodesRef.current.length > 0 && lastDragPos.current) {
                    const currentX = e.target.x();
                    const currentY = e.target.y();

                    const dx = currentX - lastDragPos.current.x;
                    const dy = currentY - lastDragPos.current.y;

                    lastDragPos.current = { x: currentX, y: currentY };

                    // Move other selected keys
                    draggedNodesRef.current.forEach(node => {
                        node.x(node.x() + dx);
                        node.y(node.y() + dy);
                    });
                }
            }}
            onDragEnd={handleDragEndCenter}
            dragBoundFunc={dragBoundFunc}
            onClick={(e) => {
                e.cancelBubble = true;
                onSelect(data.id, e.evt.shiftKey || e.evt.ctrlKey);
            }}
            ref={groupRef}
        >
            {/* Key Shape centered at 0,0 */}
            {data.variant === 'iso_enter' ? (
                <Path
                    x={-halfW}
                    y={-halfH}
                    data={ISO_ENTER_PATH}
                    scaleX={PIXELS_PER_U}
                    scaleY={PIXELS_PER_U}
                    fill={keyColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth / PIXELS_PER_U}
                    fillAfterStrokeEnabled={true}
                    shadowBlur={2}
                    shadowColor="black"
                    shadowOpacity={0.2}
                    shadowOffset={{ x: 2, y: 2 }}
                    hitStrokeWidth={10}
                />
            ) : (
                <Rect
                    x={-halfW}
                    y={-halfH}
                    width={width}
                    height={height}
                    fill={keyColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    cornerRadius={4}
                    shadowBlur={2}
                    shadowColor="black"
                    shadowOpacity={0.2}
                    shadowOffset={{ x: 2, y: 2 }}
                />
            )}

            {/* Top Center */}
            <Text
                x={-halfW}
                y={-halfH + 4}
                text={data.legends?.top || ''}
                width={width}
                height={height / 2 - 4}
                align="center"
                verticalAlign="top"
                fontSize={12}
                fill={textColor}
                listening={false}
            />
            {/* Bottom Center */}
            <Text
                x={-halfW}
                y={0}
                text={data.legends?.bottom || ''}
                width={width}
                height={height / 2 - 4}
                align="center"
                verticalAlign="bottom"
                fontSize={12}
                fill={textColor}
                listening={false}
            />
            {/* Left Middle */}
            <Text
                x={-halfW + 4}
                y={-halfH}
                text={data.legends?.left || ''}
                width={width / 2 - 4}
                height={height}
                align="left"
                verticalAlign="middle"
                fontSize={12}
                fill={textColor}
                listening={false}
            />
            {/* Right Middle */}
            <Text
                x={0}
                y={-halfH}
                text={data.legends?.right || ''}
                width={width / 2 - 4}
                height={height}
                align="right"
                verticalAlign="middle"
                fontSize={12}
                fill={textColor}
                listening={false}
            />

            {/* Matrix Row/Col Display */}
            <Text
                x={-halfW + 3}
                y={-halfH + 3}
                text={`${data.matrix?.row ?? 0}, ${data.matrix?.col ?? 0}`}
                fontSize={10}
                fill="#999"
                listening={false}
            />

            {/* Rotation Handle */}
            {isSelected && (
                <React.Fragment>
                    {/* Stem */}
                    <Rect
                        x={-1}
                        y={-halfH - 25}
                        width={2}
                        height={25}
                        fill={strokeColor}
                        listening={false}
                    />
                    {/* Knob */}
                    <Circle
                        x={0}
                        y={-halfH - 25}
                        radius={6}
                        fill="white"
                        stroke={strokeColor}
                        strokeWidth={2}
                        draggable
                        onDragStart={(e) => {
                            e.cancelBubble = true;

                            // Initialize rotation context
                            const state = useStore.getState();
                            const selectedIds = state.selectedKeyIds;

                            // Check if this key is part of the selection (it should be if handle is visible)
                            if (selectedIds.length > 1 && selectedIds.includes(data.id)) {
                                const stage = e.target.getStage();
                                const participatingNodes = new Map<string, Konva.Node>();
                                const selectedSet = new Set(selectedIds);
                                // Filter project keys ONCE at start of drag
                                const participatingKeys = state.project.keys.filter(k => selectedSet.has(k.id));

                                if (stage) {
                                    participatingKeys.forEach(k => {
                                        const node = stage.findOne('#' + k.id);
                                        if (node) {
                                            participatingNodes.set(k.id, node);
                                        }
                                    });
                                }

                                rotationContextRef.current = {
                                    participatingKeys,
                                    participatingNodes,
                                    pivotId: data.id
                                };
                            } else {
                                rotationContextRef.current = null;
                            }
                        }}
                        onDragMove={handleRotationDragMove}
                        onDragEnd={(e) => {
                            e.cancelBubble = true;

                            // Clear context
                            rotationContextRef.current = null;

                            // Commit Pending Updates
                            if (pendingRotationUpdates.current.length > 0) {
                                updateKeys(pendingRotationUpdates.current);
                                pendingRotationUpdates.current = [];
                            }

                            // Reset position of handle is automatic since it's a child?
                            // Wait, if we drag it, Konva modifies its x,y.
                            // We MUST reset its position back to (0, -halfH - 25) after drag.
                            // Otherwise it stays where we dragged it relative to parent.
                            e.target.position({ x: 0, y: -halfH - 25 });
                        }}
                        dragBoundFunc={(pos) => pos} // allow free movement visually during drag, but we use the pointer position for math
                        cursor="grab"
                    />
                </React.Fragment>
            )}
        </Group>
    );
};

export default React.memo(KeyObject);
