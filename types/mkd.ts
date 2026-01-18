export interface Position {
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

export type KeyVariant = 'rect' | 'iso_enter' | 'stepped_caps' | 'bae';

export interface KeyData {
  id: string;
  position: Position; // unit: U (1U = 19.05mm)
  size: Size; // unit: U
  angle: number; // degrees
  rotationCenter: Position; // relative to key center
  visualLegend: string;
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
