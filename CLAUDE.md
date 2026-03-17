# CLAUDE.md — KeyboardLayouter (MKD)

## Project Overview

**Modern Keyboard Layout Editor (MKD)** — A web-based tool for designing mechanical keyboard layouts with support for KiCad PCB export and QMK firmware export. Built with Next.js 16 (App Router), React 19, Konva.js canvas, and Zustand state management.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| Canvas | Konva.js 10 + react-konva |
| State | Zustand 5 + Zundo 2 (undo/redo) |
| Storage | IndexedDB (primary) + localStorage (fallback) |
| Language | TypeScript 5 (strict mode) |
| Testing | Jest (unit/benchmark) + Playwright (e2e) |
| Package Manager | pnpm (use pnpm, not npm) |

---

## Directory Structure

```
KeyboardLayouter/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout with metadata + Geist fonts
│   ├── page.tsx                # Entry: renders EditorLayout
│   └── globals.css             # Global CSS
├── components/editor/          # All React UI components
│   ├── EditorLayout.tsx        # Top-level layout (TopBar + sidebars + canvas)
│   ├── TopBar.tsx              # Toolbar: add keys, undo/redo, grid, export
│   ├── LeftSidebar.tsx         # Key presets + project management
│   ├── RightSidebar.tsx        # Property editor for selected key(s)
│   ├── KeyboardShortcuts.tsx   # Global keyboard event handler
│   └── CanvasArea/
│       ├── MainCanvas.tsx      # Konva Stage: zoom, pan, selection, drag-drop
│       ├── CanvasWrapper.tsx   # Wrapper for canvas (SSR guard)
│       ├── KeyObject.tsx       # Individual key renderer (Konva Group)
│       ├── KeyList.tsx         # Renders all keys via KeyObject
│       └── GridBackground.tsx  # Grid lines on canvas
├── store/
│   └── useStore.ts             # Zustand store + Zundo temporal (single source of truth)
├── lib/
│   ├── constants.ts            # PIXELS_PER_U, zoom limits, grid defaults
│   ├── geometry.ts             # SAT collision, rotated rect math
│   ├── idb.ts                  # IndexedDB wrapper (Promise API)
│   ├── storage.ts              # Zustand storage middleware (debounced IDB)
│   ├── qmk.ts                  # QMK info.json export
│   └── kicad.ts                # KiCad schematic + PCB export (ZIP)
├── types/
│   └── mkd.ts                  # Core TypeScript interfaces
├── e2e/                        # Playwright end-to-end tests
├── benchmarks/                 # Jest performance benchmarks
├── mocks/
│   └── uuid.js                 # Deterministic UUID mock for tests
├── docs/
│   └── SPECIFICATION.md        # Detailed technical spec (Japanese)
├── .jules/                     # AI development notes
├── jest.config.ts
├── playwright.config.ts
├── next.config.ts
└── tsconfig.json
```

---

## Core Data Types (`types/mkd.ts`)

```typescript
interface KeyData {
  id: string;                    // UUID
  position: Position;            // { x, y } in U units
  size: Size;                    // { w, h } in U units
  angle: number;                 // Rotation in degrees
  rotationCenter: Position;      // Relative offset from key center
  legends: { top: string; bottom: string; left: string; right: string; };
  matrix: { row: number; col: number; };
  variant?: 'rect' | 'iso_enter' | 'stepped_caps' | 'bae';
  isSelected?: boolean;
}

interface ProjectData {
  id: string;
  name: string;
  keys: KeyData[];
  createdAt: number;
  updatedAt: number;
}
```

**Coordinate system**: positions are in **U units** (1U = 19.05mm physically). Canvas renders at `PIXELS_PER_U = 60` pixels per U by default, scaled by the zoom level.

---

## State Management (`store/useStore.ts`)

- Single Zustand store wrapping all editor state
- **Zundo temporal** wraps the store for undo/redo (limit: 50 states)
- **`useShallow`** from Zustand used extensively in components to avoid unnecessary re-renders
- Store is **persisted** using a custom storage middleware that writes only `project` and `savedProjects` to IndexedDB (debounced 1000ms)

Key state fields:
- `project` — current `ProjectData`
- `savedProjects` — `Record<string, ProjectData>` of all saved projects
- `scale` / `pan` — zoom level and canvas offset
- `selectedKeyIds` — array of selected key UUIDs
- `clipboard` — copy/paste buffer
- `snapEnabled` / `gridSize` — grid snapping configuration

When modifying the store, actions live inside `useStore.ts`. Do not manipulate state directly outside the store.

---

## Key Architectural Patterns

### Transient Updates (Performance Critical)
During high-frequency drag operations, `KeyObject.tsx` uses **imperative Konva node updates** rather than dispatching to the Zustand store on every frame. The store is only updated on `dragEnd`. This prevents React re-renders during drag and is critical for 60fps performance. See `.jules/bolt.md` for context.

### Debounced Storage
Storage writes are debounced 1000ms to prevent IndexedDB thrashing during rapid state changes (e.g., continuous drag).

### SAT Collision Detection (`lib/geometry.ts`)
The selection box uses the **Separating Axis Theorem** to correctly detect intersection with rotated keys. Do not replace with simple AABB for correctness.

### Grid Snapping
Keys snap to configurable grid sizes (0.05U to 1U). Snap is applied in the store's move actions, not in the canvas component.

---

## Development Workflow

### Setup
```bash
pnpm install
pnpm dev          # starts Next.js dev server at http://localhost:3000
```

### Commands
```bash
pnpm dev          # development server
pnpm build        # production build
pnpm lint         # ESLint
pnpm test         # Jest unit tests
pnpm test:watch   # Jest watch mode
pnpm test:e2e     # Playwright e2e tests (requires running dev server or auto-started)
```

### Running Specific Tests
```bash
# Single unit test file
pnpm test lib/geometry.test.ts

# E2e tests (Playwright auto-starts dev server)
pnpm test:e2e e2e/shortcuts.spec.ts
```

---

## Testing

### Unit Tests (Jest)
Located in the same directory as source files:
- `lib/geometry.test.ts` — geometry math
- `lib/storage.test.ts` — storage adapter
- `lib/qmk.test.ts` — QMK export
- `lib/kicad.test.ts` — KiCad export
- `components/editor/LeftSidebar.test.tsx` — component test

**UUID determinism**: Tests use `mocks/uuid.js` which provides deterministic UUIDs. This mock is configured in `jest.config.ts`. Do not import `uuid` directly in tests that need deterministic output.

### E2E Tests (Playwright)
Located in `e2e/`:
- Chromium only
- Base URL: `http://localhost:3000`
- Playwright auto-starts the dev server for the test run
- On CI: 2 retries, 1 worker. Locally: no retries, unlimited workers.

### Performance Benchmarks (Jest)
Located in `benchmarks/`:
- Use Jest with real component rendering to measure render/operation times
- Run with `pnpm test benchmarks/`
- Not part of the standard `pnpm test` suite (excluded by default)

---

## TypeScript Conventions

The project uses **strict TypeScript** with extra safety flags:
- `noUncheckedIndexedAccess` — array/object access returns `T | undefined`; always guard indexed access
- `noImplicitReturns` — all code paths must return
- `noFallthroughCasesInSwitch` — all switch cases must break/return

**Path alias**: Use `@/` for root-relative imports:
```typescript
import { KeyData } from '@/types/mkd';
import { PIXELS_PER_U } from '@/lib/constants';
```

---

## Export Features

### QMK Export (`lib/qmk.ts`)
Generates `info.json` compatible with QMK Configurator. Physical positions are in U units; rotation origin (`rx`, `ry`) is calculated from key center + `rotationCenter` offset.

### KiCad Export (`lib/kicad.ts`)
Generates a ZIP archive containing:
- `.kicad_sch` — schematic with switch-diode matrix wiring
- `.kicad_pcb` — PCB layout with physical key coordinates

Physical scale: 1U = 19.05mm. All coordinates are transformed to millimeters for KiCad.

---

## Keyboard Shortcuts (implemented in `KeyboardShortcuts.tsx`)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd+C` | Copy selected keys |
| `Ctrl/Cmd+V` | Paste (offset +0.5U) |
| `Ctrl/Cmd+D` | Duplicate selected |
| `Delete` / `Backspace` | Delete selected |
| Arrow keys | Move selected by grid size |
| `Ctrl/Cmd+Z` | Undo |
| `Ctrl/Cmd+Y` / `Ctrl/Cmd+Shift+Z` | Redo |

---

## CI Pipeline (`.github/workflows/ci.yml`)

1. Checkout + Node.js 22 setup
2. `npm ci` — install dependencies
3. `npm run lint` — ESLint
4. `npm run test` — Jest unit tests
5. `npm run build` — Next.js production build

Note: CI uses `npm ci` (not pnpm). Locally, use `pnpm`.

---

## Important Conventions

1. **Do not bypass transient updates**: The `KeyObject` drag optimization imperatively mutates Konva nodes. Do not convert drag handlers to pure React state updates — this will break performance.

2. **U units everywhere in store**: All positions and sizes in the Zustand store are in U units. Pixel conversion (`× PIXELS_PER_U × scale`) only happens at render time in Konva components.

3. **Matrix auto-assign**: The store's `autoAssignMatrix()` action sorts keys by position (row-major, with 0.5U tolerance) and assigns sequential row/col indices. Do not assign matrix values manually when this action is available.

4. **Shallow selectors**: When subscribing to array or object slices of the store, always use `useShallow`:
   ```typescript
   const keys = useStore(useShallow(s => s.project.keys));
   ```

5. **No direct DOM manipulation for canvas**: All canvas interactions go through Konva's React API or imperative node refs. Do not use raw `<canvas>` APIs.

6. **Storage partializing**: Only `project` and `savedProjects` are persisted. Ephemeral UI state (`scale`, `pan`, `selectedKeyIds`, `clipboard`) is not saved between sessions by design.
