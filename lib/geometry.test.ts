import { doPolygonsIntersect, getRotatedRectPoints, getRotatedRectAABB, Point } from './geometry';

describe('geometry', () => {
  describe('doPolygonsIntersect', () => {
    it('should return true for intersecting polygons', () => {
      // Two overlapping squares
      const poly1: Point[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 }
      ];
      const poly2: Point[] = [
        { x: 5, y: 5 },
        { x: 15, y: 5 },
        { x: 15, y: 15 },
        { x: 5, y: 15 }
      ];
      expect(doPolygonsIntersect(poly1, poly2)).toBe(true);
    });

    it('should return false for non-intersecting polygons', () => {
      // Two separate squares
      const poly1: Point[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 }
      ];
      const poly2: Point[] = [
        { x: 20, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 10 },
        { x: 20, y: 10 }
      ];
      expect(doPolygonsIntersect(poly1, poly2)).toBe(false);
    });

    it('should return true for one polygon inside another', () => {
      const outer: Point[] = [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 20 },
        { x: 0, y: 20 }
      ];
      const inner: Point[] = [
        { x: 5, y: 5 },
        { x: 15, y: 5 },
        { x: 15, y: 15 },
        { x: 5, y: 15 }
      ];
      expect(doPolygonsIntersect(outer, inner)).toBe(true);
    });

    it('should correctly handle rotated rectangles intersection', () => {
      // Square 1: (0,0) to (10,10)
      const rect1 = getRotatedRectPoints(0, 0, 10, 10, 0);

      // Square 2: Rotated 45 degrees, x=8, y=0, w=10, h=10, cx=5, cy=5.
      // Center is at (13, 5).
      // Rect 1 center (5,5). Distance X is 8.
      // Rotated 45 deg, half-diagonal is 7.07. Min X = 13 - 7.07 = 5.93.
      // Overlap with Rect 1 (max X = 10).
      const rect2 = getRotatedRectPoints(8, 0, 10, 10, 45, 5, 5);

      expect(doPolygonsIntersect(rect1, rect2)).toBe(true);
    });

    it('should correctly handle rotated rectangles non-intersection', () => {
      const rect1 = getRotatedRectPoints(0, 0, 10, 10, 0);
      // Rect 2 center at (20, 5). x=15, y=0, cx=5, cy=5.
      const rect2 = getRotatedRectPoints(15, 0, 10, 10, 45, 5, 5);
      // Min X = 20 - 7.07 = 12.93. > 10.
      expect(doPolygonsIntersect(rect1, rect2)).toBe(false);
    });
  });

  describe('getRotatedRectPoints', () => {
    it('should return correct points for 0 degree rotation', () => {
      const points = getRotatedRectPoints(0, 0, 10, 10, 0);
      expect(points).toEqual([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 }
      ]);
    });

    it('should return correct points for 90 degree rotation', () => {
      // Rotating 90 degrees around top-left (0,0) with default center (0,0)
      const points = getRotatedRectPoints(0, 0, 10, 10, 90);

      const expected = [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: -10, y: 10 },
        { x: -10, y: 0 }
      ];

      // Floating point check
      points.forEach((p, i) => {
        expect(p.x).toBeCloseTo(expected[i]!.x);
        expect(p.y).toBeCloseTo(expected[i]!.y);
      });
    });

    it('should return correct points for rotation with custom center', () => {
      // Rotate 90 degrees around center (5, 5)
      const points = getRotatedRectPoints(0, 0, 10, 10, 90, 5, 5);

      const expected = [
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
        { x: 0, y: 0 }
      ];

      points.forEach((p, i) => {
        expect(p.x).toBeCloseTo(expected[i]!.x);
        expect(p.y).toBeCloseTo(expected[i]!.y);
      });
    });
  });

  describe('getRotatedRectAABB', () => {
    it('should return exact bounds for 0 rotation', () => {
      const aabb = getRotatedRectAABB(10, 20, 30, 40, 0);
      expect(aabb).toEqual({ minX: 10, maxX: 40, minY: 20, maxY: 60 });
    });

    it('should return correct bounds for 90 rotation', () => {
      // 10x10 rect at (0,0), rotated 90 around center (5,5)
      // Center stays at (5,5).
      // Original corners: (0,0), (10,0), (10,10), (0,10)
      // Rotated: (10,0), (10,10), (0,10), (0,0)
      // AABB should be same 0-10 range.

      const aabb = getRotatedRectAABB(0, 0, 10, 10, 90, 5, 5);
      expect(aabb.minX).toBeCloseTo(0);
      expect(aabb.maxX).toBeCloseTo(10);
      expect(aabb.minY).toBeCloseTo(0);
      expect(aabb.maxY).toBeCloseTo(10);
    });

    it('should return correct bounds for 45 rotation', () => {
      // 10x10 rect at (0,0), rotated 45 around center (5,5)
      // Center (5,5). Half-diagonal = sqrt(5^2 + 5^2) = sqrt(50) = 7.071
      // Min = Center - 7.071 = -2.071
      // Max = Center + 7.071 = 12.071

      const aabb = getRotatedRectAABB(0, 0, 10, 10, 45, 5, 5);

      expect(aabb.minX).toBeCloseTo(5 - Math.sqrt(50));
      expect(aabb.maxX).toBeCloseTo(5 + Math.sqrt(50));
      expect(aabb.minY).toBeCloseTo(5 - Math.sqrt(50));
      expect(aabb.maxY).toBeCloseTo(5 + Math.sqrt(50));
    });
  });
});
