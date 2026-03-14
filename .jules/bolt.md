## 2024-05-23 - Transient Updates for High-Frequency Canvas Interactions
**Learning:** Updating global state (Zustand) on every frame of a drag interaction (e.g., rotation) causes massive re-renders of the entire canvas or key list, leading to jank.
**Action:** Use "Transient Updates":
1. Update Konva nodes imperatively during `dragMove` (`node.x()`, `node.rotation()`) to provide 60fps visual feedback.
2. Store the pending state changes in a `useRef`.
3. Commit the final state to the store only on `dragEnd`.
This pattern decouples the visual loop from the React render loop.

## 2024-05-18 - RightSidebar Zustand Subscription Opt
**Learning:** Subscribing to an entire store object via `useStore()` in a globally rendered component like `RightSidebar` will cause it to re-render constantly for unrelated changes (like drag pan/zoom).
**Action:** Use `useShallow` with a selector mapping to explicitly define dependencies (e.g., `projectKeys` and `selectedKeyIds`). Also, favor bulk array operations like `deleteSelectedKeys()` over $O(N)$ sequential mutations like `forEach(removeKey)` which cause redundant layout reflows and Store updates.
