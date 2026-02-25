## 2024-05-23 - Transient Updates for High-Frequency Canvas Interactions
**Learning:** Updating global state (Zustand) on every frame of a drag interaction (e.g., rotation) causes massive re-renders of the entire canvas or key list, leading to jank.
**Action:** Use "Transient Updates":
1. Update Konva nodes imperatively during `dragMove` (`node.x()`, `node.rotation()`) to provide 60fps visual feedback.
2. Store the pending state changes in a `useRef`.
3. Commit the final state to the store only on `dragEnd`.
This pattern decouples the visual loop from the React render loop.

## 2025-02-18 - Optimized Konva Node Lookup in Drag Handlers
**Learning:** `stage.findOne()` is an O(M) operation (where M is scene graph size). Calling it inside a loop for N selected items during `dragMove` results in O(N*M) complexity per frame, causing significant lag with large key counts.
**Action:** Cache `Konva.Node` references in a Map during `dragStart` (one-time O(N*M) cost) and use O(1) Map lookups inside the `dragMove` loop. This reduces per-frame complexity to O(N).
