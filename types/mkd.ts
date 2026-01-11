export interface Position {
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

export interface KeyData {
  id: string;
  position: Position; // unit: U (1U = 19.05mm)
  size: Size; // unit: U
  angle: number; // degrees
  rotationCenter: Position; // relative to key center (or absolute, TBD - simplified for MVP as relative or fixed)
  // For MVP: let's assume rotationCenter is relative to key x,y or top-left. 
  // Standard KLE rotates around the top-left of the key by default usually, or a specified point.
  // We'll store it as {x,y} coordinate logic same as position.
  visualLegend: string;
  matrix: {
    row: number;
    col: number;
  };
  isSelected?: boolean;
}

export interface ProjectData {
  id: string;
  name: string;
  keys: KeyData[];
  createdAt: number;
  updatedAt: number;
}
