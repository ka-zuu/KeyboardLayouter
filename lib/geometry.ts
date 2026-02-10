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
        if (!polygon) continue;
        
        // Iterate over vertices to get edges
        for (let j = 0; j < polygon.length; j++) {
            const k = (j + 1) % polygon.length;
            const p1 = polygon[j];
            const p2 = polygon[k];

            if (!p1 || !p2) continue;

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
 * @param precalc Optional pre-calculated sin and cos values
 * @returns Array of 4 points representing the corners of the rotated rectangle
 */
export function getRotatedRectPoints(
    x: number,
    y: number,
    w: number,
    h: number,
    angle: number,
    cx: number = 0,
    cy: number = 0,
    precalc?: { sin: number, cos: number }
): Point[] {
    if (angle === 0) {
        return [
            { x: x, y: y },              // Top-Left
            { x: x + w, y: y },          // Top-Right
            { x: x + w, y: y + h },      // Bottom-Right
            { x: x, y: y + h }           // Bottom-Left
        ];
    }

    const centerX = x + cx;
    const centerY = y + cy;

    // Use pre-calculated trig values if available, otherwise calculate them
    let sin: number, cos: number;
    if (precalc) {
        sin = precalc.sin;
        cos = precalc.cos;
    } else {
        const rad = (angle * Math.PI) / 180;
        cos = Math.cos(rad);
        sin = Math.sin(rad);
    }

    // Calculate 4 corners
    const p1 = rotatePointPrecalc({ x, y }, { x: centerX, y: centerY }, sin, cos);            // Top-Left
    const p2 = rotatePointPrecalc({ x: x + w, y }, { x: centerX, y: centerY }, sin, cos);        // Top-Right
    const p3 = rotatePointPrecalc({ x: x + w, y: y + h }, { x: centerX, y: centerY }, sin, cos);    // Bottom-Right
    const p4 = rotatePointPrecalc({ x, y: y + h }, { x: centerX, y: centerY }, sin, cos);        // Bottom-Left

    return [p1, p2, p3, p4];
}

/**
 * Calculates the Axis-Aligned Bounding Box (AABB) of a rotated rectangle.
 * This is faster than calculating all points first.
 */
export function getRotatedRectAABB(
    x: number,
    y: number,
    w: number,
    h: number,
    angle: number,
    cx: number = 0,
    cy: number = 0,
    precalc?: { sin: number, cos: number }
): { minX: number, maxX: number, minY: number, maxY: number } {
    if (angle === 0) {
        return {
            minX: x,
            maxX: x + w,
            minY: y,
            maxY: y + h
        };
    }

    const centerX = x + cx;
    const centerY = y + cy;

    let sin: number, cos: number;
    if (precalc) {
        sin = precalc.sin;
        cos = precalc.cos;
    } else {
        const rad = (angle * Math.PI) / 180;
        cos = Math.cos(rad);
        sin = Math.sin(rad);
    }

    // Original corners relative to rotation center:
    // Top-Left: (-cx, -cy)
    // Top-Right: (w-cx, -cy)
    // Bottom-Right: (w-cx, h-cy)
    // Bottom-Left: (-cx, h-cy)

    // x' = x*cos - y*sin + centerX
    // y' = x*sin + y*cos + centerY

    // We can compute min/max X/Y by checking the extrema of each term.
    // X range: [-cx, w-cx]
    // Y range: [-cy, h-cy]

    const xMinRel = -cx;
    const xMaxRel = w - cx;
    const yMinRel = -cy;
    const yMaxRel = h - cy;

    // Calculate X extrema
    // term1 = x * cos
    const xTerm1a = xMinRel * cos;
    const xTerm1b = xMaxRel * cos;
    const minXTerm1 = Math.min(xTerm1a, xTerm1b);
    const maxXTerm1 = Math.max(xTerm1a, xTerm1b);

    // term2 = -y * sin
    const xTerm2a = -yMinRel * sin;
    const xTerm2b = -yMaxRel * sin;
    const minXTerm2 = Math.min(xTerm2a, xTerm2b);
    const maxXTerm2 = Math.max(xTerm2a, xTerm2b);

    const minX = minXTerm1 + minXTerm2 + centerX;
    const maxX = maxXTerm1 + maxXTerm2 + centerX;

    // Calculate Y extrema
    // term1 = x * sin
    const yTerm1a = xMinRel * sin;
    const yTerm1b = xMaxRel * sin;
    const minYTerm1 = Math.min(yTerm1a, yTerm1b);
    const maxYTerm1 = Math.max(yTerm1a, yTerm1b);

    // term2 = y * cos
    const yTerm2a = yMinRel * cos;
    const yTerm2b = yMaxRel * cos;
    const minYTerm2 = Math.min(yTerm2a, yTerm2b);
    const maxYTerm2 = Math.max(yTerm2a, yTerm2b);

    const minY = minYTerm1 + minYTerm2 + centerY;
    const maxY = maxYTerm1 + maxYTerm2 + centerY;

    return { minX, maxX, minY, maxY };
}

/**
 * Rotates a point around a center by a given angle in degrees.
 * @param point The point to rotate {x, y}
 * @param center The center of rotation {x, y}
 * @param angleDeg The angle in degrees
 * @returns The rotated point {x, y}
 */
export function rotatePoint(point: Point, center: Point, angleDeg: number): Point {
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const dx = point.x - center.x;
    const dy = point.y - center.y;

    return {
        x: center.x + (dx * cos - dy * sin),
        y: center.y + (dx * sin + dy * cos)
    };
}

/**
 * Rotates a point around a center using pre-calculated sine and cosine values.
 * Useful for optimizing loops where multiple points are rotated by the same angle.
 * @param point The point to rotate {x, y}
 * @param center The center of rotation {x, y}
 * @param sin Pre-calculated sine of the rotation angle
 * @param cos Pre-calculated cosine of the rotation angle
 * @returns The rotated point {x, y}
 */
export function rotatePointPrecalc(point: Point, center: Point, sin: number, cos: number): Point {
    const dx = point.x - center.x;
    const dy = point.y - center.y;

    return {
        x: center.x + (dx * cos - dy * sin),
        y: center.y + (dx * sin + dy * cos)
    };
}
