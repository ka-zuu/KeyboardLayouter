export const PIXELS_PER_U = 60; // 1U = 60px on screen by default
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3.0;
export const SNAP_SIZE = 0.25; // 0.25U snap

// ISO Enter defined as 1.5U width, 2.0U height overall bounding box?
// Top part width: 1.5U. Bottom part width: 1.25U.
// Top height: 1.0U. Bottom height: 1.0U. Total Height: 2.0U.
// Coordinate system relative to top-left (0,0).
// (0,0) -> (1.5, 0) -> (1.5, 2.0) -> (0.25, 2.0) -> (0.25, 1.0) -> (0, 1.0) -> (0,0)
// Wait, usually ISO Enter is:
// Top: 1.5U. Bottom: 1.25U.
// The "overhang" is on the left? No, usually right aligned?
// Standard ISO Enter:
// Row 1: 1.5U. Row 2: 1.25U (aligned to right).
// So shape:
// (0,0) -- 1.5U --> (1.5, 0)
// (1.5, 0) -- 2.0U --> (1.5, 2.0)
// (1.5, 2.0) -- 1.25U --> (0.25, 2.0)
// (0.25, 2.0) -- 1.0U --> (0.25, 1.0)
// (0.25, 1.0) -- 0.25U --> (0, 1.0)
// (0, 1.0) -- 1.0U --> (0,0)
// Let's define it in SVG path commands. 1U = 1 (scaled by PIXELS_PER_U later)
export const ISO_ENTER_PATH = "M 0,0 L 1.5,0 L 1.5,2 L 0.25,2 L 0.25,1 L 0,1 Z";

