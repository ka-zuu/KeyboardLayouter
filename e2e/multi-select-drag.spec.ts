import { test, expect } from '@playwright/test';

test.describe('Multi-select Drag Interaction', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Ensure clean state by clearing IDB and localStorage
        await page.evaluate(async () => {
            localStorage.clear();
            if (window.indexedDB) {
                await new Promise<void>((resolve, reject) => {
                    const req = indexedDB.deleteDatabase('mkd-db');
                    req.onsuccess = () => resolve();
                    req.onerror = () => reject(req.error);
                    req.onblocked = () => resolve();
                });
            }
        });
        await page.reload();
        await expect(page.getByRole('button', { name: 'Add Keys' })).toBeVisible();
    });

    test('should allow dragging multiple keys together and maintain relative positions', async ({ page }) => {
        // 1. Add 2 keys
        const countInput = page.locator('div').filter({ hasText: /^Count:$/ }).getByRole('spinbutton');
        await countInput.fill('2');
        await page.getByRole('button', { name: 'Add Keys' }).click();

        // Wait for keys to be rendered (canvas activity)
        // Since persistence is debounced/async, checking UI is better.
        // We can check if "2 keys" are visually present or if the store has them (via IDB).
        // Let's use a helper to check IDB.
        await page.waitForFunction(async () => {
             return new Promise((resolve) => {
                 const req = indexedDB.open('mkd-db', 1);
                 req.onsuccess = () => {
                     const db = req.result;
                     if (!db.objectStoreNames.contains('keyval')) {
                        resolve(false); return;
                     }
                     const tx = db.transaction('keyval', 'readonly');
                     const store = tx.objectStore('keyval');
                     const getReq = store.get('mkd-storage');
                     getReq.onsuccess = () => {
                         const val = getReq.result;
                         if (val && val.state && val.state.project && val.state.project.keys.length >= 2) {
                             resolve(true);
                         } else {
                             resolve(false);
                         }
                     };
                     getReq.onerror = () => resolve(false);
                 };
                 req.onerror = () => resolve(false);
             });
        });

        // 2. Locate Canvas
        const canvas = page.locator('canvas').first();
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        // Key 1 Center (approx): 0.5U = 30px. (0,0) origin.
        const k1X = box.x + 30;
        const k1Y = box.y + 30;
        
        // Key 2 Center (approx): 1.5U = 90px
        const k2X = box.x + 90;
        const k2Y = box.y + 30;

        // 3. Select Both Keys
        // Click Key 1
        await page.mouse.click(k1X, k1Y);
        // Shift+Click Key 2
        await page.keyboard.down('Shift');
        await page.mouse.click(k2X, k2Y);
        await page.keyboard.up('Shift');

        // Wait for sidebar to reflect selection (Robust wait)
        await expect(page.getByText('2 items selected')).toBeVisible();

        // 4. Verify Sidebar "Auto-assign Matrix" button is visible
        // The button title is "Auto-assign Matrix to selected keys" and text is "Auto-assign Matrix"
        await expect(page.getByRole('button', { name: 'Auto-assign Matrix', exact: true })).toBeVisible();

        // 5. Drag Key 1 Down by 100px
        await page.mouse.move(k1X, k1Y);
        await page.mouse.down();
        await page.mouse.move(k1X, k1Y + 100, { steps: 5 }); // Move slowly
        await page.mouse.up();

        // 6. Verify positions in Store
        // Wait for store update (Key 1 should have moved > 1U)
        // Debounce is 1000ms, so we wait.
        // Removed hardcoded timeout in favor of polling via manual loop to ensure robustness
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let projectData: any = null;
        for (let i = 0; i < 30; i++) { // Poll for up to 6 seconds (200ms * 30)
            projectData = await page.evaluate(async () => {
                 return new Promise((resolve) => {
                     const req = indexedDB.open('mkd-db', 1);
                     req.onsuccess = () => {
                         const db = req.result;
                         const tx = db.transaction('keyval', 'readonly');
                         const store = tx.objectStore('keyval');
                         const getReq = store.get('mkd-storage');
                         getReq.onsuccess = () => {
                             const val = getReq.result;
                             if (val && val.state && val.state.project && val.state.project.keys) {
                                 // Check if any key moved > 1U (approx 1.0)
                                 const moved = val.state.project.keys.some((k: { position: { y: number } }) => k.position.y > 1);
                                 if (moved) {
                                    resolve(val.state.project);
                                 } else {
                                    resolve(null);
                                 }
                             } else {
                                 resolve(null);
                             }
                         };
                         getReq.onerror = () => resolve(null);
                     };
                     req.onerror = () => resolve(null);
                 });
            });
            if (projectData) break;
            await page.waitForTimeout(200);
        }

        if (!projectData) throw new Error("Project data was not updated in IDB after drag");

        const keys = projectData.keys.sort((a: { position: { x: number } }, b: { position: { x: number } }) => a.position.x - b.position.x);
        
        // Key 1 initial: (0,0). Moved +100px Y.
        // 100px / 60px/U = 1.666 U.
        // It snaps to grid 0.25U. 
        // 1.666 -> nearest 0.25 is 1.75. 
        // 1.75 * 60 = 105px. Or 1.5 * 60 = 90px.
        // 100 / 15 = 6.66 -> 7 * 15 = 105.
        // Expected Y approx 1.66U.
        
        const k1 = keys[0];
        const k2 = keys[1];

        // Verify Key 1 moved
        expect(k1.position.y).toBeGreaterThan(1);
        
        // Verify Key 2 moved BY SAME AMOUNT (approx)
        // Their relative Y should be 0 (same row originally, moved together).
        // Allowing for small float precision
        expect(Math.abs(k1.position.y - k2.position.y)).toBeLessThan(0.01);
        
        // Their relative X should be 1U (Maintained spacing)
        expect(Math.abs(k2.position.x - k1.position.x)).toBeCloseTo(1.0, 1);
    });
});
