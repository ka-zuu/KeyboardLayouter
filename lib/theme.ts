/**
 * Canvas (Konva) color tokens.
 *
 * Konva draws to a bitmap and cannot consume Tailwind classes or CSS
 * variables, so the canvas layer needs its own palette. These values mirror
 * the semantic design tokens defined in `app/globals.css` — keep the two in
 * sync so the DOM chrome and the canvas read as one system.
 *
 * Future light-mode note: to make the canvas theme-aware, replace these
 * constants with values read at runtime from the CSS variables, e.g.
 *   getComputedStyle(document.documentElement).getPropertyValue('--canvas')
 * and re-render the stage on theme change. Kept static (dark) for now.
 */
export const canvasTheme = {
  /** Editing surface background (matches --canvas). */
  background: '#0d0e12',

  /** Grid: subtle minor lines on every snap cell, stronger lines every 1U. */
  gridMinor: '#1c1f27',
  gridMajor: '#2c3039',
  /** Origin axes (top/left borders of the layout area). */
  axis: '#3a3e4a',

  /** Keycap face (light cap on dark canvas) + subtle bezel/base tone. */
  keyFace: '#eceef1',
  keyBase: '#cfd2d9',
  keyStroke: '#b4b8c1',
  keyStrokeSelected: '#4d8dff',
  /** Solid base for keycap drop shadows; alpha is applied via shadowOpacity. */
  keyShadow: '#000000',

  /** Legend + matrix label text drawn on the keycap. */
  legendText: '#33363d',
  matrixText: '#8b8f98',

  /** Marquee (drag) selection rectangle. */
  selectionStroke: '#4d8dff',
  selectionFill: 'rgba(77, 141, 255, 0.16)',

  /** Rotation handle knob. */
  handleFill: '#ffffff',
  handleStroke: '#4d8dff',
} as const;

export type CanvasTheme = typeof canvasTheme;
