# Assert's Journal

## Critical Learnings

### E2E Testing with React-Konva

When testing React-Konva applications with Playwright:
1.  **Strict Mode Violations**: `locator('canvas')` is dangerous because Konva creates multiple canvas elements (one per Layer). Use a unique `data-testid` on the wrapping container.
2.  **Waiting for Stage**: `getByTestId` on a static wrapper returns immediately, potentially before the Konva Stage is rendered. To ensure the Stage is ready for interaction (like clicks), chain `.locator('.konvajs-content')` which targets the div created by Konva. This implicitly waits for the Stage to be mounted.
    -   ❌ `page.getByTestId('main-canvas').click()` (Might click before Stage is ready)
    -   ✅ `page.getByTestId('main-canvas').locator('.konvajs-content').click()` (Waits for Stage)
