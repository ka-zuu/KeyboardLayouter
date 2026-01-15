"use client";

import React, { useRef } from 'react';
import { Group, Rect, Text, Circle, Path } from 'react-konva';
import { KeyData } from '@/types/mkd';
import { PIXELS_PER_U, SNAP_SIZE, ISO_ENTER_PATH } from '@/lib/constants';
import { useStore } from '@/store/useStore';
import { rotatePoint } from '@/lib/geometry';
import Konva from 'konva';

interface KeyObjectProps {
    data: KeyData;
    isSelected: boolean;
    onSelect: (id: string, multi: boolean) => void;
    onDragEnd: (id: string, x: number, y: number) => void;
}

const KeyObject: React.FC<KeyObjectProps> = ({ data, isSelected, onSelect, onDragEnd }) => {
    const { snapEnabled, updateKey, updateKeys, project, selectedKeyIds } = useStore();
    const groupRef = useRef<Konva.Group>(null);

    // Convert units to pixels
    const width = data.size.w * PIXELS_PER_U;
    const height = data.size.h * PIXELS_PER_U;
    // data.position IS Top-Left.
    const x = data.position.x * PIXELS_PER_U;
    const y = data.position.y * PIXELS_PER_U;

    // Calculate Center for Pivot
    const halfW = width / 2;
    const halfH = height / 2;
    const centerX = x + halfW;
    const centerY = y + halfH;

    // Visual styling
    const keyColor = '#f0f0f0';
    const textColor = '#333';
    const strokeColor = isSelected ? '#3b82f6' : '#999';
    const strokeWidth = isSelected ? 3 : 1;

    const handleDragEndCenter = (e: Konva.KonvaEventObject<DragEvent>) => {
        const nx = e.target.x();
        const ny = e.target.y();
        // nx, ny is new Center.
        // data.x (TopLeft) = nx - halfW
        // Convert px to U
        const uX = (nx - halfW) / PIXELS_PER_U;
        const uY = (ny - halfH) / PIXELS_PER_U;

        // Rounding is handled by manual logic or if we want exact.
        // store updates with whatever we give.
        onDragEnd(data.id, uX, uY);
    };

    const dragBoundFunc = (pos: { x: number; y: number }) => {
        if (!snapEnabled) return pos;

        // We are dragging the GROUP, whose origin is CENTER.
        // We want the TOP-LEFT to snap to grid.
        // pos.x is Center X. TopLeft X = pos.x - halfW.
        // Snap TopLeft X to grid.
        // Snapped TopLeft X = round( (pos.x - halfW) / snap ) * snap
        // New Center X = Snapped TopLeft + halfW.

        // HOWEVER, DragBoundFunc receives absolute position.
        // If we assume stage scale is 1, it's screen pixels.
        // If zoomed, Konva handles it? DragBoundFunc gets "absolute position of the node".
        // It seems Konva handles scale mapping for us if we use stage APIs, but dragBoundFunc receives absolute view coords usually?
        // Actually dragBoundFunc receives "absolute position".
        // Let's rely on standard logic.

        const snapPx = SNAP_SIZE * PIXELS_PER_U;

        // We want (pos.x - halfW) to be multiple of snapPx
        const snappedTopLeftX = Math.round((pos.x - halfW) / snapPx) * snapPx;
        const snappedTopLeftY = Math.round((pos.y - halfH) / snapPx) * snapPx;

        return {
            x: snappedTopLeftX + halfW,
            y: snappedTopLeftY + halfH,
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

        // If single selection, just update this key
        if (selectedKeyIds.length <= 1 || !selectedKeyIds.includes(data.id)) {
            updateKey(data.id, { angle: newRotation });
            return;
        }

        // Batch Rotation
        const pivotId = data.id;
        const previousAngle = data.angle;
        // Calculate delta
        const deltaRotation = newRotation - previousAngle;

        // Prepare updates
        const updates: { id: string, data: Partial<KeyData> }[] = [];

        // Pivot Center in U units
        const pivotCenterX = data.position.x + data.size.w / 2;
        const pivotCenterY = data.position.y + data.size.h / 2;

        project.keys.forEach(k => {
            if (selectedKeyIds.includes(k.id)) {
                if (k.id === pivotId) {
                    updates.push({ id: k.id, data: { angle: newRotation } });
                } else {
                    // Normalize angle
                    const kNewAngle = k.angle + deltaRotation;

                    // Orbitting Logic
                    // 1. Get Key Center
                    const kCenterX = k.position.x + k.size.w / 2;
                    const kCenterY = k.position.y + k.size.h / 2;

                    // 2. Rotate Key Center around Pivot Center
                    const rotatedCenter = rotatePoint(
                        { x: kCenterX, y: kCenterY },
                        { x: pivotCenterX, y: pivotCenterY },
                        deltaRotation
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
                }
            }
        });

        if (updates.length > 0) {
            updateKeys(updates);
        }
    };

    return (
        <Group
            x={centerX}
            y={centerY}
            width={width}
            height={height}
            offsetX={0}
            offsetY={0}
            rotation={data.angle}
            draggable
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
                    x={-halfW} // Path starts at 0,0. We need to center it. 
                    // ISO Enter Width is 1.5U approx (actually bounding box is what we used for width).
                    // Our path definition "M 0,0 ..." is in U units.
                    // We simply scale the Group or Path?
                    // Better to scale the Path data? No, simpler to use scale attribute on Path?
                    // Or pre-calculate path string in pixels?
                    // Let's use scale transform on Path.
                    // But width/height calculation in parent was based on data.size.
                    // If variant is ISO Enter, data.size should be {w: 1.5, h: 2.0}.
                    // Path is defined in U.
                    y={-halfH}
                    data={ISO_ENTER_PATH}
                    scaleX={PIXELS_PER_U}
                    scaleY={PIXELS_PER_U}
                    fill={keyColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth / PIXELS_PER_U} // Stroke acts weird with scale?
                    // If we scale the Path object, stroke scales too.
                    // Better to keep strokeWidth constant?
                    // Konva 'vectorEffect' non-scaling-stroke? Not supported well.
                    // Alternative: Define path in Pixels.
                    // M 0,0 L 1.5*60,0 ...
                    // Let's do dynamic path generation string.
                    fillAfterStrokeEnabled={true}
                    shadowBlur={2}
                    shadowColor="black"
                    shadowOpacity={0.2}
                    shadowOffset={{ x: 2, y: 2 }}
                    hitStrokeWidth={10} // easier selection
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
            <Text
                x={-halfW}
                y={-halfH}
                text={data.visualLegend}
                width={width}
                height={height}
                align="center"
                verticalAlign="middle"
                fontSize={14}
                fill={textColor}
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
                        onDragStart={(e) => e.cancelBubble = true}
                        onDragMove={handleRotationDragMove}
                        onDragEnd={(e) => {
                            e.cancelBubble = true;
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

export default KeyObject;
