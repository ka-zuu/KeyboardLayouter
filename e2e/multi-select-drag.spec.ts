import { test, expect } from '@playwright/test';

test.describe('Multi-select Drag Interaction', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Ensure clean state by clearing localStorage
        await page.evaluate(() => {
            localStorage.clear();
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
        await page.waitForTimeout(500);

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

        // 4. Verify Sidebar "Auto-assign Matrix" button is visible
        // The button title is "Auto-assign Matrix to selected keys" and text is "Auto-assign Matrix"
        await expect(page.getByRole('button', { name: 'Auto-assign Matrix', exact: true })).toBeVisible();

        // 5. Drag Key 1 Down by 100px
        await page.mouse.move(k1X, k1Y);
        await page.mouse.down();
        await page.mouse.move(k1X, k1Y + 100, { steps: 5 }); // Move slowly
        await page.mouse.up();

        // 6. Verify positions in Store
        const projectData = await page.evaluate(() => {
             const storage = localStorage.getItem('mkd-storage');
             if (!storage) return null;
             return JSON.parse(storage).state.project;
        });

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
        
        console.log('Final Positions:', k1.position, k2.position);
    });
});
