/**
 * Point interface representing a 2D coordinate.
 */
export interface Point {
    x: number;
    y: number;
}

/**
 * Check if two polygons intersect using the Separating Axis Theorem (SAT).
 * 
 * SAT states that if two convex polygons do not intersect, then there exists a line (axis)
 * such that the projections of the two polygons onto this line do not overlap.
 * We test the normals of each edge of both polygons as potential separating axes.
 * 
 * @param polygonA Array of points representing the first polygon (vertices).
 * @param polygonB Array of points representing the second polygon (vertices).
 * @returns true if they intersect, false otherwise.
 */
export function doPolygonsIntersect(polygonA: Point[], polygonB: Point[]): boolean {
    const polygons = [polygonA, polygonB];

    // Iterate over both polygons to test axes derived from their edges
    for (let i = 0; i < polygons.length; i++) {
        const polygon = polygons[i];
        
        // Iterate over vertices to get edges
        for (let j = 0; j < polygon.length; j++) {
            const k = (j + 1) % polygon.length;
            const p1 = polygon[j];
            const p2 = polygon[k];

            // Get the normal vector of the edge (perpendicular to the edge)
            // Edge vector = (p2.x - p1.x, p2.y - p1.y)
            // Normal vector = (-(p2.y - p1.y), p2.x - p1.x) or (p2.y - p1.y, -(p2.x - p1.x))
            // Here we use { x: p2.y - p1.y, y: p1.x - p2.x }
            const normal = { x: p2.y - p1.y, y: p1.x - p2.x };

            // Project both polygons onto the normal axis
            let minA: number | undefined = undefined;
            let maxA: number | undefined = undefined;
            
            for (const p of polygonA) {
                const projected = normal.x * p.x + normal.y * p.y;
                if (minA === undefined || projected < minA) minA = projected;
                if (maxA === undefined || projected > maxA) maxA = projected;
            }

            let minB: number | undefined = undefined;
            let maxB: number | undefined = undefined;

            for (const p of polygonB) {
                const projected = normal.x * p.x + normal.y * p.y;
                if (minB === undefined || projected < minB) minB = projected;
                if (maxB === undefined || projected > maxB) maxB = projected;
            }

            // Check for overlap on this axis
            // If there is no overlap, then we found a separating axis, so they don't intersect.
            if (maxA! < minB! || maxB! < minA!) {
                return false;
            }
        }
    }
    // No separating axis found, so they must intersect
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
 * @returns Array of 4 points representing the corners of the rotated rectangle
 */
export function getRotatedRectPoints(x: number, y: number, w: number, h: number, angle: number, cx: number = 0, cy: number = 0): Point[] {
    if (angle === 0) {
        return [
            { x: x, y: y },              // Top-Left
            { x: x + w, y: y },          // Top-Right
            { x: x + w, y: y + h },      // Bottom-Right
            { x: x, y: y + h }           // Bottom-Left
        ];
    }

    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Center of rotation in world coordinates
    const centerX = x + cx;
    const centerY = y + cy;

    // Helper to rotate a point around the center
    const rotatePoint = (px: number, py: number): Point => {
        const dx = px - centerX;
        const dy = py - centerY;
        return {
            x: centerX + (dx * cos - dy * sin),
            y: centerY + (dx * sin + dy * cos)
        };
    };

    // Calculate 4 corners
    const p1 = rotatePoint(x, y);            // Top-Left
    const p2 = rotatePoint(x + w, y);        // Top-Right
    const p3 = rotatePoint(x + w, y + h);    // Bottom-Right
    const p4 = rotatePoint(x, y + h);        // Bottom-Left

    return [p1, p2, p3, p4];
}
