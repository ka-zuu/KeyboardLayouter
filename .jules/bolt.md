## 2024-05-23 - Transient Updates for High-Frequency Canvas Interactions
**Learning:** Updating global state (Zustand) on every frame of a drag interaction (e.g., rotation) causes massive re-renders of the entire canvas or key list, leading to jank.
**Action:** Use "Transient Updates":
1. Update Konva nodes imperatively during `dragMove` (`node.x()`, `node.rotation()`) to provide 60fps visual feedback.
2. Store the pending state changes in a `useRef`.
3. Commit the final state to the store only on `dragEnd`.
This pattern decouples the visual loop from the React render loop.
