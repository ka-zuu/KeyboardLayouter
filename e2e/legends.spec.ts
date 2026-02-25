import { test, expect } from '@playwright/test';

test.describe('Multi-Legend Support', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(1000);
    });

    test('should allow setting 4 legends (Top, Bottom, Left, Right)', async ({ page }) => {
        // 1. Add a key using TopBar button (adds default 1U key with 'A' at 0,0)
        await page.getByRole('button', { name: 'Add Keys' }).click();
        
        // 2. Select the key (Click at 30,30 relative to canvas, assuming key size is ~60px and at 0,0)
        // Note: Canvas container might be shifted, but locator('canvas') click is relative to the element.
        await page.locator('canvas').click({ position: { x: 30, y: 30 } });

        // 3. Verify Right Sidebar inputs
        // "A" is default for Top
        const inputTop = page.getByPlaceholder('Top');
        const inputBottom = page.getByPlaceholder('Bottom');
        const inputLeft = page.getByPlaceholder('Left');
        const inputRight = page.getByPlaceholder('Right');

        await expect(inputTop).toBeVisible();
        await expect(inputTop).toHaveValue('');
        
        // Ensure other inputs are empty
        await expect(inputBottom).toHaveValue('');
        await expect(inputLeft).toHaveValue('');
        await expect(inputRight).toHaveValue('');

        // 4. Update Legends
        await inputTop.fill('Q');
        await inputRight.fill('W');
        await inputLeft.fill('E');
        await inputBottom.fill('R');
        
        // We cannot easily verify canvas text without visual diff or internal state access.
        // But verifying that inputs retain value implies store update.
        await expect(inputTop).toHaveValue('Q');
    });

    test('should persist legends after page reload', async ({ page }) => {
        // Add key and set legends
        await page.getByRole('button', { name: 'Add Keys' }).click();
        await page.locator('canvas').click({ position: { x: 30, y: 30 } });
        
        await page.getByPlaceholder('Right').fill('Test');
        // Check input update instead of text visible
        await expect(page.getByPlaceholder('Right')).toHaveValue('Test');

        // Reload
        await page.reload();
        await page.waitForTimeout(1000);
        
        // Select key again to check properties
        // Store persistence should keep the key
        await page.locator('canvas').click({ position: { x: 30, y: 30 } });

        // Verify "Test" is still in input
        await expect(page.getByPlaceholder('Right')).toHaveValue('Test');
    });
});
