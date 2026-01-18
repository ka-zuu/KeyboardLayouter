import { doPolygonsIntersect, getRotatedRectPoints, Point } from './geometry';

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
});
