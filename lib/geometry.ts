/**
 * Point interface
 */
export interface Point {
    x: number;
    y: number;
}

/**
 * Check if two polygons intersect using the Separating Axis Theorem (SAT).
 * @param a Array of points representing the first polygon (vertices).
 * @param b Array of points representing the second polygon (vertices).
 * @returns true if they intersect, false otherwise.
 */
export function doPolygonsIntersect(a: Point[], b: Point[]): boolean {
    const polygons = [a, b];
    let minA, maxA, projected, i, i1, j, minB, maxB;

    for (i = 0; i < polygons.length; i++) {
        const polygon = polygons[i];
        for (i1 = 0; i1 < polygon.length; i1++) {
            const i2 = (i1 + 1) % polygon.length;
            const p1 = polygon[i1];
            const p2 = polygon[i2];

            const normal = { x: p2.y - p1.y, y: p1.x - p2.x };

            minA = maxA = undefined;
            for (j = 0; j < a.length; j++) {
                projected = normal.x * a[j].x + normal.y * a[j].y;
                if (minA === undefined || projected < minA) minA = projected;
                if (maxA === undefined || projected > maxA) maxA = projected;
            }

            minB = maxB = undefined;
            for (j = 0; j < b.length; j++) {
                projected = normal.x * b[j].x + normal.y * b[j].y;
                if (minB === undefined || projected < minB) minB = projected;
                if (maxB === undefined || projected > maxB) maxB = projected;
            }

            if (maxA! < minB! || maxB! < minA!) return false;
        }
    }
    return true;
}

/**
 * Calculates the vertices of a rotated rectangle.
 * @param x x coordinate of the top-left corner (unrotated)
 * @param y y coordinate of the top-left corner (unrotated)
 * @param w width
 * @param h height
 * @param angle rotation angle in degrees
 * @param cx rotation center x (relative to x)
 * @param cy rotation center y (relative to y)
 * @returns Array of 4 points
 */
export function getRotatedRectPoints(x: number, y: number, w: number, h: number, angle: number, cx: number = 0, cy: number = 0): Point[] {
    if (angle === 0) {
        return [
            { x: x, y: y },
            { x: x + w, y: y },
            { x: x + w, y: y + h },
            { x: x, y: y + h }
        ];
    }

    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Center of rotation in world coordinates
    const centerX = x + cx;
    const centerY = y + cy;

    // Helper to rotate a point around center
    const rotatePoint = (px: number, py: number) => {
        const dx = px - centerX;
        const dy = py - centerY;
        return {
            x: centerX + (dx * cos - dy * sin),
            y: centerY + (dx * sin + dy * cos)
        };
    };

    // 4 corners relative to (x, y)
    // Assuming rotation origin usually described relative to key.
    // If cx, cy are offsets from x,y.
    
    // Top-Left
    const p1 = rotatePoint(x, y);
    // Top-Right
    const p2 = rotatePoint(x + w, y);
    // Bottom-Right
    const p3 = rotatePoint(x + w, y + h);
    // Bottom-Left
    const p4 = rotatePoint(x, y + h);

    return [p1, p2, p3, p4];
}
