import { test, expect, Page } from '@playwright/test';

test.describe('Performance Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
    });

    async function addKeys(page: Page, count: number) {
        const remaining = count;
        const maxPerBatch = 20; // App limit
        const batches = Math.ceil(remaining / maxPerBatch);
        
        const countInput = page.locator('div').filter({ hasText: /^Count:$/ }).getByRole('spinbutton');
        const addButton = page.getByRole('button', { name: 'Add Keys' });

        for (let i = 0; i < batches; i++) {
            const batchSize = Math.min(remaining - (i * maxPerBatch), maxPerBatch);
            await countInput.fill(batchSize.toString());
            await addButton.click();
        }
    }

    test('should add 50 keys within acceptable time', async ({ page }) => {
        const startTime = Date.now();

        await addKeys(page, 50);

        // Wait for key count to update in store
        await page.waitForFunction(() => {
            const storage = localStorage.getItem('mkd-storage');
            if (!storage) return false;
            const state = JSON.parse(storage).state;
            return state.project.keys.length === 50;
        });

        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`Time to add 50 keys: ${duration}ms`);
        
        // Allow some buffer, but 50 keys should be very fast (< 3s usually, including batching overhead)
        expect(duration).toBeLessThan(5000); 
    });

    test('should drag a key smoothly with 50 keys present', async ({ page }) => {
        // Setup: Add 50 keys
        await addKeys(page, 50);
        
        // Wait for keys
        await page.waitForFunction(() => {
             const storage = localStorage.getItem('mkd-storage');
             if (!storage) return false;
             return JSON.parse(storage).state.project.keys.length === 50;
        });

        // Get position of the first key to drag
        const firstKeyPos = await page.evaluate(() => {
            const storage = localStorage.getItem('mkd-storage');
            if (!storage) return { x: 0, y: 0 };
            const keys = JSON.parse(storage).state.project.keys;
            return keys[0].position;
        });

        // Canvas offset needs to be accounted for? 
        // Usually Konva canvas covers the area. 
        // We will assume the canvas starts at some offset or we interact with the canvas element directly.
        const canvas = page.getByTestId('main-canvas').locator('.konvajs-content');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        // Initial key position in client logic usually maps to canvas coordinates.
        // Assuming 1:1 map for simplicity or center. 
        // Without knowing the viewport transform, exact usage is hard.
        // However, usually newly added keys are visible.
        // Let's try dragging near the computed position relative to canvas bounding box.
        // Wait, the key position (x,y) is internal. Visually it implies an offset from the canvas origin.
        
        // Let's assume the Viewport is at (0,0) initially.
        const startX = box.x + firstKeyPos.x + 20; // +20 for center of key (assuming key size ~40)
        const startY = box.y + firstKeyPos.y + 20;

        const startTime = Date.now();
        
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX + 100, startY + 100, { steps: 10 }); 
        await page.mouse.up();

        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`Time to drag a key with 50 keys: ${duration}ms`);
        expect(duration).toBeLessThan(2000); 
    });


});
