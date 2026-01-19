import { test, expect } from '@playwright/test';

test.describe('Multi-Legend Support', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(1000);
    });

    test('should allow setting 4 legends (TL, TR, BL, BR)', async ({ page }) => {
        // 1. Add a key using TopBar button (adds default 1U key with 'A' at 0,0)
        await page.getByRole('button', { name: 'Add Keys' }).click();
        
        // 2. Select the key (Click at 30,30 relative to canvas, assuming key size is ~60px and at 0,0)
        // Note: Canvas container might be shifted, but locator('canvas') click is relative to the element.
        await page.locator('canvas').click({ position: { x: 30, y: 30 } });

        // 3. Verify Right Sidebar inputs
        // "A" is default for TL
        const inputTL = page.getByPlaceholder('TL');
        const inputTR = page.getByPlaceholder('TR');
        const inputBL = page.getByPlaceholder('BL');
        const inputBR = page.getByPlaceholder('BR');

        await expect(inputTL).toBeVisible();
        await expect(inputTL).toHaveValue('A');
        
        // Ensure other inputs are empty
        await expect(inputTR).toHaveValue('');
        await expect(inputBL).toHaveValue('');
        await expect(inputBR).toHaveValue('');

        // 4. Update Legends
        await inputTL.fill('Q');
        await inputTR.fill('W');
        await inputBL.fill('E');
        await inputBR.fill('R');
        
        // We cannot easily verify canvas text without visual diff or internal state access.
        // But verifying that inputs retain value implies store update.
        await expect(inputTL).toHaveValue('Q');
    });

    test('should persist legends after page reload', async ({ page }) => {
        // Add key and set legends
        await page.getByRole('button', { name: 'Add Keys' }).click();
        await page.locator('canvas').click({ position: { x: 30, y: 30 } });
        
        await page.getByPlaceholder('TR').fill('Test');
        // Check input update instead of text visible
        await expect(page.getByPlaceholder('TR')).toHaveValue('Test');

        // Reload
        await page.reload();
        await page.waitForTimeout(1000);
        
        // Select key again to check properties
        // Store persistence should keep the key
        await page.locator('canvas').click({ position: { x: 30, y: 30 } });

        // Verify "Test" is still in input
        await expect(page.getByPlaceholder('TR')).toHaveValue('Test');
    });
});
