# Assert's Journal

- **Test Hydration Determinism:** In Next.js/React applications with client-side hydration or asynchronous stores (like Zustand with IndexedDB persistence), waiting for hydration should rely on deterministic assertions of the resulting UI state (e.g., `expect(locator).toBeVisible()`) rather than arbitrary `waitForTimeout` calls. Fixed-duration sleep introduces flakiness when environments are slower and needlessly pads execution time on faster environments.
