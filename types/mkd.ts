export interface Position {
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

// Note: only 'rect' and 'iso_enter' are currently rendered on the canvas.
// 'stepped_caps' is declared but not yet implemented (falls back to rect rendering).
export type KeyVariant = 'rect' | 'iso_enter' | 'stepped_caps';

export interface KeyData {
  id: string;
  position: Position; // unit: U (1U = 19.05mm)
  size: Size; // unit: U
  angle: number; // degrees
  rotationCenter: Position; // relative to key center
  legends: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
  matrix: {
    row: number;
    col: number;
  };
  variant?: KeyVariant; // Optional for backward compatibility (default: 'rect')
  isSelected?: boolean;
}

export interface ProjectData {
  id: string;
  name: string;
  keys: KeyData[];
  createdAt: number;
  updatedAt: number;
}
